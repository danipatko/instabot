import { convert, RedditMediaPost, RedditQueryResult } from './types';
import type { Fetch, Source } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import { Promise } from 'bluebird';
import { promisify } from 'util';
import fetch from 'node-fetch';
import path from 'path/posix';
import prisma from '../db';
import fs from 'fs';
const SAVE_PATH = 'public';

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

const fetchPosts = async (id: number): Promise<Source[] | Source | null | null[]> => {
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
        .then(({ data }) => Promise.map(data.children, ({ data }) => processPost(data)))
        .then((posts) =>
            // I know this is anti-pattern, but for some reason,
            // the prisma.create function is 'not thenable' and
            // throws an error
            Promise.map(posts, async (post) => await prisma.source.create({ data: post }))
        )
        .catch((e) => {
            console.log(`Failed to fetch posts from reddit.\n${e}`);
            return null;
        });
};

const processPost = async (post: RedditMediaPost) => {
    console.log(`Processing ${post.name}`);
    if (post.post_hint === 'image') {
        return dlImage(post.url, post.name).then(() => ({ ...convert(post), file: post.name + '.jpg' }));
    } else if (post.post_hint === 'hosted:video' && !post.url.endsWith('.gif')) {
        const url = videoUrl(post);
        if (!url) throw new Error('Incompatible post.');
        post.url = url;
        return dlVideo(post.url, post.name).then(() => ({ ...convert(post), file: post.name + '.mp4' }));
    }
    throw new Error('Incompatible post.');
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

const audioUrl = (url: string) => url.replaceAll(/DASH_\d{2,5}/gm, 'DASH_audio');

const videoUrl = (post: RedditMediaPost): string | undefined => {
    if (post.media) return post.media.reddit_video.fallback_url;
    else if (post.secure_media) return post.secure_media.reddit_video.fallback_url;
};

const dlImage = async (url: string, name: string) => {
    const ext = getExt(url);
    if (!ext) throw new Error('Invalid file url');
    const input = path.join(SAVE_PATH, `${name}temp.${ext}`);
    const output = path.join(SAVE_PATH, `${name}.${ext}`);
    return dl(url, input).then(() => processImage(input, output));
};

const dlVideo = async (url: string, name: string) => {
    const ext = getExt(url);
    if (!ext) throw new Error('Invalid file url');

    const inputV = path.join(SAVE_PATH, `${name}video.${ext}`);
    const inputA = path.join(SAVE_PATH, `${name}audio.${ext}`);
    const output = path.join(SAVE_PATH, name + '.mp4');
    const cover = path.join(SAVE_PATH, name + 'cover.jpg');

    return dl(url, inputV)
        .then(() => dl(audioUrl(url), inputA))
        .then(() => processVideo(inputV, inputA, output, cover));
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

export { fetchPosts };
