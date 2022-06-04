import fs from 'fs';
import path from 'path/posix';
import QB from '../db/builder';
import fetch from 'node-fetch';
import Table from '../db/table';
import { randStr, sleep } from '../util';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(process.platform === 'win32' ? 'C:/Users/Dani/home/Setups/ffmpeg-2022-06-01-git-c6364b711b-full_build/bin/ffmpeg.exe' : 'ffmpeg');

export interface RedditVideo {
    width: number;
    height: number;
    is_gif: boolean;
    duration: number; // in seconds
    bitrate_kbps: number;
    fallback_url: string;
}

// fetched from the reddit API
export interface RedditPostBase {
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

export interface RedditMediaPost extends RedditPostBase {
    url: string;
    media: null | { reddit_video: RedditVideo };
    secure_media: null | { reddit_video: RedditVideo };
}

export interface IRedditPost extends RedditPostBase {
    id: string;
    url: string;
    // media
    file: string;
    is_gif: boolean;
    accepted: boolean; // can upload to insta
    uploaded: boolean; // can upload to insta
    duration?: number; // in seconds
    thumbnail?: string;
    accepted_by: string; // who marked it
    bitrate_kbps?: number;
}

const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(max, num));

const redditPostTable = new Table<IRedditPost>(
    'redditpost',
    {
        id: 'VARCHAR(20) PRIMARY KEY',
        ups: 'INTEGER',
        url: 'TEXT',
        file: 'VARCHAR(60)',
        name: 'VARCHAR(30) UNIQUE',
        title: 'TEXT',
        score: 'INTEGER',
        downs: 'INTEGER',
        is_gif: 'BOOLEAN',
        author: 'VARCHAR(120)',
        over_18: 'BOOLEAN',
        duration: 'INTEGER',
        is_video: 'BOOLEAN',
        accepted: 'BOOLEAN',
        uploaded: 'BOOLEAN',
        thumbnail: 'TEXT',
        subreddit: 'VARCHAR(60)',
        post_hint: 'VARCHAR(60)',
        created_utc: 'INTEGER',
        accepted_by: 'VARCHAR(20)',
        upvote_ratio: 'REAL',
        num_comments: 'INTEGER',
        bitrate_kbps: 'INTEGER',
    },
    true
);

export default class RedditPost implements IRedditPost {
    public id: string;
    public ups: number;
    public url: string;
    public name: string;
    public file: string; // the location of the file
    public downs: number;
    public title: string;
    public score: number;
    public author: string;
    public over_18: boolean;
    public is_gif: boolean;
    public is_video: boolean;
    public accepted: boolean;
    public uploaded: boolean;
    public duration?: number | undefined;
    public subreddit: string;
    public post_hint: 'hosted:video' | 'rich:video' | 'image' | 'self';
    public created_utc: number;
    public accepted_by: string;
    public num_comments: number;
    public upvote_ratio: number;
    public bitrate_kbps?: number | undefined;

    public static create(_: RedditMediaPost) {
        const post: IRedditPost = {
            ..._,
            id: randStr(20),
            file: '',
            is_gif: false,
            accepted: false,
            uploaded: false,
            accepted_by: '',
        };
        post.file = path.join('public', `${post.name}.${this.getExtension(post.url)}`);
        if (_.post_hint !== 'hosted:video') return new RedditPost(post);

        if (_.media) {
            post.url = _.media.reddit_video.fallback_url;
            post.is_gif = _.media.reddit_video.is_gif;
            post.duration = _.media.reddit_video.duration;
            post.bitrate_kbps = _.media.reddit_video.bitrate_kbps;
        } else if (_.secure_media) {
            post.url = _.secure_media.reddit_video.fallback_url;
            post.is_gif = _.secure_media.reddit_video.is_gif;
            post.duration = _.secure_media.reddit_video.duration;
            post.bitrate_kbps = _.secure_media.reddit_video.bitrate_kbps;
        }
        post.file = path.join('public', `${post.name}.${this.getExtension(post.url)}`);
        return new RedditPost(post);
    }

    public constructor(_: IRedditPost) {
        this.id = _.id;
        this.url = _.url;
        this.ups = _.ups;
        this.file = _.file;
        this.name = _.name;
        this.score = _.score;
        this.downs = _.downs;
        this.title = _.title;
        this.author = _.author;
        this.is_gif = _.is_gif;
        this.over_18 = _.over_18;
        this.uploaded = _.uploaded;
        this.accepted = _.accepted;
        this.is_video = _.is_video;
        this.duration = _.duration;
        this.post_hint = _.post_hint;
        this.subreddit = _.subreddit;
        this.accepted_by = _.accepted_by;
        this.created_utc = _.created_utc;
        this.upvote_ratio = _.upvote_ratio;
        this.num_comments = _.num_comments;
        this.bitrate_kbps = _.bitrate_kbps;
    }

    // fetch by id
    public static fetch = async (id: string) => await redditPostTable.fetch(id);
    // filter
    public static get = async (query: QB<IRedditPost>) => await redditPostTable.get(query);
    // get unaccepted posts
    public static pending = async () => await redditPostTable.get(QB.select<IRedditPost>().from('redditpost').where('accepted').is(0));

    // save in database and download (+ convert if necessary)
    public async save() {
        console.log(`[info] saving post (${this.id}) to ${this.file}`);
        await redditPostTable.insert({
            ...this,
            accepted: false,
            accepted_by: '',
        });
        await this.download();
    }

    // remove from database
    public async remove() {
        await redditPostTable.remove(this.id);
        fs.unlinkSync(this.file);
    }

    // download a file
    protected async downloadFile(url: string, id: string) {
        const response = await fetch(url);
        if (!response.ok) return void console.error(`[error] Failed to fetch image ${url}`);

        try {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(path.join('public', `${id}.${RedditPost.getExtension(url)}`), buffer);
        } catch (error) {
            console.error(`[error] Failed to save image ${this.url}\n`, error);
        }
    }

    public async download() {
        // download image
        if (this.post_hint !== 'hosted:video') return void (await this.downloadFile(this.url, this.name));
        // download video
        await this.downloadFile(this.url, this.name + 'video');
        await this.downloadFile(this.getAudioUrl(), this.name + 'audio');
        await this.concatAudio();
        // wait and remove unnecessary files
        await sleep(1000);
        fs.unlinkSync(path.join('public', `${this.name}video.mp4`));
        fs.unlinkSync(path.join('public', `${this.name}audio.mp4`));
    }

    protected async concatAudio(): Promise<void> {
        return new Promise((res) => {
            if (!this.bitrate_kbps) return void res();

            ffmpeg()
                .input(path.join('public', `${this.name}video.mp4`))
                .size('720x720') // 1:1 ratio
                .autopad(true, 'black') // create a black padding around the video
                .videoBitrate(clamp(this.bitrate_kbps, 2000, 4000) + 'k') // 3500 is recommended
                .input(path.join('public', `${this.name}audio.mp4`))
                .audioCodec('aac')
                .audioBitrate('256k')
                .output(path.join('public', `${this.name}.mp4`))
                // create a cover image too
                .takeScreenshots({ count: 1, timemarks: ['0.0'], filename: path.join('public', `${this.name}cover.png`) })
                .on('progress', (p) => console.log(`[info] Converting ${this.name}: ${Math.floor(p.percent)}%`))
                .once('end', res)
                .run();
        });
    }

    protected static getExtension(url: string): string | null {
        const last = url.split('.').pop();
        if (!last) {
            console.log('[error] Invalid url:', url);
            return null;
        }
        return last.split('?')[0]; // fallback url has query params -> (...DASH_720.mp4?source=fallback)
    }

    protected getAudioUrl() {
        return this.url.replaceAll(/DASH_\d{2,5}/gm, 'DASH_audio');
    }
}
