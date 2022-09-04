import { convert, RedditMediaPost, RedditQueryResult } from './types';
import type { Fetch, Source } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import { Promise } from 'bluebird';
import { promisify } from 'util';
import path from 'path/posix';
import prisma from '../db';
import fs from 'fs';
import { defaultCaption } from '../util';

const SAVE_PATH = 'content';

const write = promisify(fs.writeFile);
const rm = promisify(fs.rm);
ffmpeg.setFfmpegPath('ffmpeg');

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

const fetchPosts = async (id: number, account_id: number | undefined = undefined) => {
    return prisma.fetch
        .findFirst({ where: { id } })
        .then((data) => {
            if (!data) throw new Error('Query not found.');
            console.log(buildUrl(data));
            return fetch(buildUrl(data), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        })
        .then((res) => {
            if (!res.ok) throw new Error(`Request returned code ${res.status} - ${res.statusText}`);
            return res.json() as Promise<RedditQueryResult>;
        })
        .then(({ data }) => Promise.map(data.children, ({ data }) => validatePost(data)))
        .then((posts) =>
            Promise.map(posts, async (source) => {
                if (account_id === undefined) await prisma.source.create({ data: source });
                else
                    await prisma.source.create({
                        data: {
                            ...source,
                            archived: true,
                            post: {
                                create: {
                                    caption: defaultCaption(source.title, source.author, source.url),
                                    account_id,
                                    upload_index: await prisma.post.count({ where: { uploaded: false } }),
                                },
                            },
                        },
                    });
            })
        )
        .catch((e) => {
            console.log(`Failed to fetch posts from reddit.\n${e}`);
        });
};

const validatePost = async (post: RedditMediaPost) => {
    if (post.post_hint === 'image') {
        return { ...convert(post), file: post.name + '.jpg' };
    } else if (post.post_hint === 'hosted:video' && !post.url.endsWith('.gif')) {
        const media = videoUrl(post);
        if (!media) throw new Error('Incompatible post.');
        post.url = media.url;
        return { ...convert(post, media.dash_url), file: post.name + '.mp4' };
    }
    throw new Error('Incompatible post.');
};

const processPost = async (post: Source) => {
    console.log(`Processing ${post.name}`);
    return post.post_hint === 'image' ? dlImage(post.url, post.name) : dlVideo(post.url, post.name);
};

const dl = async (url: string, _path: string): Promise<void> => {
    console.log(`Downloading ${url} to ${_path}`);
    return fetch(url)
        .then((res) => {
            if (res.ok) return res.arrayBuffer();
            throw new Error(`Download failed: request returned code ${res.status} - ${res.statusText}`);
        })
        .then((buf) => write(_path, Buffer.from(buf)));
};

const getExt = (url: string): string | null => {
    const last = url.split('.').pop();
    return last ? last.split('?')[0] : null;
};

const audioUrl = (url: string) => url.replace(/DASH_\d{2,5}/gm, 'DASH_audio');

const videoUrl = (post: RedditMediaPost): { url: string; dash_url: string } | null => {
    if (!(post.media || post.secure_media)) return null;
    const media = post.media || post.secure_media;
    if (!media) return null;
    return { url: media.reddit_video.fallback_url, dash_url: media.reddit_video.dash_url };
};

const dlImage = async (url: string, name: string): Promise<string> => {
    const ext = getExt(url);
    if (!ext) throw new Error('Invalid file url');
    const input = path.join(SAVE_PATH, `${name}temp.${ext}`);
    const output = path.join(SAVE_PATH, `${name}.${ext}`);
    return dl(url, input)
        .then(() => processImage(input, output))
        .then(() => output);
};

const dlVideo = async (url: string, name: string): Promise<[string, string]> => {
    const ext = getExt(url);
    if (!ext) throw new Error('Invalid file url');

    const inputV = path.join(SAVE_PATH, `${name}video.${ext}`);
    const inputA = path.join(SAVE_PATH, `${name}audio.${ext}`);
    const output = path.join(SAVE_PATH, name + '.mp4');
    const cover = path.join(SAVE_PATH, name + 'cover.jpg');

    return dl(url, inputV)
        .then(() => dl(audioUrl(url), inputA))
        .then(() => processVideo(inputV, inputA, output, cover))
        .then(() => [output, cover]);
};

const processImage = async (input: string, output: string, removeInput = true) => {
    console.log(`Converting image (${input} => ${output})`);
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
            .on('error', (e) => rej(e))
            .run()
    );
};

const processVideo = async (inputV: string, inputA: string, output: string, cover: string, removeInput = true) => {
    console.log(`Converting video (${inputV} => ${output})`);
    return new Promise<void>((res, rej) =>
        ffmpeg()
            .input(inputV)
            .size('480x480') // 1:1 ratio
            .autopad(true, 'black') // create a black padding around the video
            .videoBitrate('3000k') // 3500 is recommended
            .input(inputA)
            .audioCodec('aac')
            .audioBitrate('256k')
            .output(output)
            // create a cover image
            .takeScreenshots({
                count: 1,
                timemarks: ['0.1'],
                filename: cover,
            })
            .once('end', () => {
                if (removeInput) {
                    console.log(`Removing ${inputA} and ${inputV}`);
                    rm(inputA)
                        .then(() => rm(inputV))
                        .then(res)
                        .catch(rej);
                } else res();
            })
            .once('error', (e) => {
                console.error(`Video conversion (${inputV} => ${output}) failed:\n${e}`);
                rej(e);
            })
            .run()
    );
};

export { fetchPosts, processPost };
