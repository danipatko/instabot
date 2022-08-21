import type { Fetch } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import fetch from 'node-fetch';
import path from 'path/posix';
import prisma from '../db';
import fs from 'fs';

const SAVE_PATH = 'public';

const write = promisify(fs.writeFile);
const rm = promisify(fs.rm);

ffmpeg.setFfmpegPath('ffmpeg');

interface RedditVideo {
    width: number;
    height: number;
    is_gif: boolean;
    duration: number; // in seconds
    bitrate_kbps: number;
    fallback_url: string;
}

// fetched from the reddit API
interface RedditPostBase {
    ups: number;
    name: string;
    downs: number;
    score: number; // = ups - downs
    title: string;
    author: string;
    over_18: boolean;
    is_video: boolean;
    subreddit: string;
    post_hint:
        | 'hosted:video' // normal video
        | 'rich:video' // e.g. a youtube embed
        | 'image' // simple image
        | 'self'; // text
    created_utc: number;
    upvote_ratio: number;
    num_comments: number;
}

interface RedditMediaPost extends RedditPostBase {
    url: string;
    media: null | { reddit_video: RedditVideo };
    account?: string;
    secure_media: null | { reddit_video: RedditVideo };
}

interface RedditQueryResult {
    data: {
        dist: number;
        children: { kind: string; data: RedditMediaPost }[];
    };
}

const buildUrl = (f: Fetch) => {
    let url = 'https://reddit.com/r/' + f.sub + '/';
    url += f.type + '.json';
    const query = Object({ t: f.time, limit: f.limit, include_over_18: f.over_18 });

    if (f.type == 'search' && f.q) {
        query.q = f.q;
        query.sort = f.sort;
    }
    if (f.page_after && f.page_reset !== 0) query.after = f.page_after;

    const params = new URLSearchParams(query).toString();
    if (params.length) url += '?' + params;
    return url;
};

const fetchPosts = async (id: number) => {
    return prisma.fetch
        .findFirst({ where: { id } })
        .then((data) => {
            if (!data) throw new Error('Query not found.');
            return fetch(buildUrl(data), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        })
        .then((res) => {
            if (!res.ok) throw new Error(`Request returned code ${res.status} - ${res.statusText}`);
            return res.json() as Promise<RedditQueryResult>;
        })
        .then(async ({ data }) => {
            for (const post of data.children) {
                await processPost(post.data);
            }
        })
        .catch((e) => {
            console.log(`Failed to fetch posts from reddit.\n${e}`);
            return null;
        });
};

const processPost = async (post: RedditMediaPost): Promise<boolean> => {
    if (post.post_hint === 'image') {
        return dlImage(post.url, post.name)
            .then(() => true)
            .catch((e) => {
                console.error(e);
                return false;
            });
    } else if (post.post_hint === 'hosted:video' && !post.url.endsWith('.gif')) {
        return dlVideo(post.url, post.name)
            .then(() => true)
            .catch((e) => {
                console.error(e);
                return false;
            });
    }
    return false;
};

const dl = async (url: string, name: string): Promise<void> => {
    return fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error(`Download failed: request returned code ${res.status} - ${res.statusText}`);
            return res.arrayBuffer();
        })
        .then((buf) => write(path.join(SAVE_PATH, name), Buffer.from(buf)));
    // .catch((e) => {
    //     console.log(`Failed to download ${url}.\n${e}`);
    //     return false;
    // });
};

const getExt = (url: string): string | null => {
    const last = url.split('.').pop();
    return last ? last.split('?')[0] : null;
};

const audioUrl = (url: string) => url.replaceAll(/DASH_\d{2,5}/gm, 'DASH_audio');

const processImage = async (input: string, output: string, removeInput = true) => {
    return new Promise<void>((res, rej) =>
        ffmpeg()
            .input(input)
            .size('1080x?')
            .aspect('1:1')
            .autopad(true, 'black')
            .output(output)
            .once('end', () => {
                if (removeInput) rm(input).then(res).catch(rej);
                else res();
            })
            .on('error', (e) => {
                console.error(`Image conversion (${input} => ${output}) failed:\n${e}`);
                rej();
            })
            .run()
    );
};

const processVideo = async (inputV: string, inputA: string, output: string, cover: string, removeInput = true) => {
    return new Promise<void>((res, rej) =>
        ffmpeg()
            .input(inputV)
            .size('720x720') // 1:1 ratio
            .autopad(true, 'black') // create a black padding around the video
            .videoBitrate('3000k') // 3500 is recommended
            .input(inputA)
            .audioCodec('aac')
            .audioBitrate('256k')
            .output(output)
            // create a cover image
            .takeScreenshots({
                count: 1,
                timemarks: ['0.0'],
                filename: cover,
            })
            // .on('progress', (p) => Logs.info(`Converting ${this.name}: ${Math.floor(p.percent)}%`))
            .once('end', () => {
                if (removeInput)
                    rm(inputA)
                        .then(() => rm(inputV))
                        .then(res)
                        .catch(rej);
                else res();
            })
            .once('error', (e) => {
                console.error(`Video conversion (${inputV} => ${output}) failed:\n${e}`);
                rej(e);
            })
            .run()
    );
};

const dlImage = async (url: string, name: string) => {
    const ext = getExt(url);
    if (!ext) throw new Error('Invalid file url');
    const input = `${name}temp.${ext}`;
    const output = `${name}.${ext}`;
    return dl(url, input).then(() => processImage(input, output));
    // .catch((e) => { // catch it top level
    //     console.error(e);
    // });
};

const dlVideo = async (url: string, name: string) => {
    const ext = getExt(url);
    if (!ext) throw new Error('Invalid file url');

    const inputV = `${name}video.${ext}`;
    const inputA = `${name}audio.${ext}`;

    return dl(url, inputV)
        .then(() => dl(audioUrl(url), inputA))
        .then(() => processVideo(inputV, inputA, name + '.mp4', name + 'cover.jpg'));
    // .catch((e) => { // catch it top level
    //     console.error(e);
    // });
};

export { fetchPosts };
