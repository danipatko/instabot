import fs from 'fs';
import path from 'path/posix';
import QB from '../db/builder';
import fetch from 'node-fetch';
import Table from '../db/table';
import ffmpeg from 'fluent-ffmpeg';
import { randStr, sleep } from '../util';
import { each, get } from '../db';

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
    account?: string;
    secure_media: null | { reddit_video: RedditVideo };
}

export interface IRedditPost extends RedditPostBase {
    id: string;
    url: string;
    // media
    file: string;
    is_gif: boolean;
    caption: string;
    account?: string; // the account that uploaded the post
    accepted: boolean; // can upload to insta
    uploaded: boolean; // is uploaded
    duration?: number; // in seconds
    accepted_by: string; // who marked it
    accepted_at: number; // when it was marked
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
        caption: 'TEXT',
        over_18: 'BOOLEAN',
        account: 'VARCHAR(20)',
        duration: 'INTEGER',
        is_video: 'BOOLEAN',
        accepted: 'BOOLEAN',
        uploaded: 'BOOLEAN',
        subreddit: 'VARCHAR(60)',
        post_hint: 'VARCHAR(60)',
        created_utc: 'INTEGER',
        accepted_at: 'INTEGER',
        accepted_by: 'VARCHAR(20)',
        upvote_ratio: 'REAL',
        num_comments: 'INTEGER',
        bitrate_kbps: 'INTEGER',
    }
    // true
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
    public is_gif: boolean;
    public over_18: boolean;
    public caption: string;
    public account?: string; // associated ig account id to upload from
    public is_video: boolean;
    public accepted: boolean;
    public uploaded: boolean;
    public duration?: number | undefined;
    public subreddit: string;
    public post_hint: 'hosted:video' | 'rich:video' | 'image' | 'self';
    public created_utc: number;
    public accepted_by: string;
    public accepted_at: number;
    public num_comments: number;
    public upvote_ratio: number;
    public bitrate_kbps?: number | undefined;

    public static create(_: RedditMediaPost) {
        const post: IRedditPost = {
            ..._,
            id: randStr(20),
            file: '',
            is_gif: false,
            caption: RedditPost.defaultCaption(_.title, _.author, _.url),
            accepted: false,
            uploaded: false,
            accepted_by: '',
            accepted_at: 0,
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
        this.caption = _.caption;
        this.over_18 = _.over_18;
        this.account = _.account;
        this.uploaded = _.uploaded;
        this.accepted = _.accepted;
        this.is_video = _.is_video;
        this.duration = _.duration;
        this.post_hint = _.post_hint;
        this.subreddit = _.subreddit;
        this.accepted_by = _.accepted_by;
        this.accepted_at = _.accepted_at;
        this.created_utc = _.created_utc;
        this.upvote_ratio = _.upvote_ratio;
        this.num_comments = _.num_comments;
        this.bitrate_kbps = _.bitrate_kbps;
    }

    // fetch by id
    public static fetch = async (id: string): Promise<RedditPost | null> => {
        const post = await redditPostTable.fetch(id);
        return post ? new RedditPost(post) : null;
    };

    // get next post to upload
    public static async nextUploadable(): Promise<null | RedditPost> {
        const data = await get<IRedditPost>('SELECT * FROM redditpost WHERE accepted=true AND uploaded=false ORDER BY accepted_at ASC LIMIT 1');
        console.log(data);
        return data ? new RedditPost(data) : null;
    }

    // filter
    public static get = async (query: QB<IRedditPost>) => await redditPostTable.get(query);
    // get unaccepted posts (10 at a time)
    public static pending = async () => await redditPostTable.get(QB.select<IRedditPost>().from('redditpost').where('accepted').is(0).limit(10));

    public update = async () => await redditPostTable.update(this);

    protected static getExtension(url: string): string | undefined {
        const last = url.split('.').pop();
        return last?.split('?')[0]; // fallback url has query params -> (...DASH_720.mp4?source=fallback)
    }

    // save in database and download
    public async save() {
        console.log(`[info] saving post (${this.id}) to ${this.file}`);
        if (!(await this.download())) return void console.log(`[info] Discarding post ${this.name}`);
        await redditPostTable.insert({
            ...this,
            accepted: false,
            accepted_by: '',
        });
    }

    // remove from database
    public async remove() {
        await redditPostTable.remove(this.id);
        try {
            fs.unlinkSync(this.file);
        } catch (error) {
            console.error(`[error] Failed to remove ${this.file}`);
        }
        // if(this.post_hint === 'hosted:video') fs.unlinkSync(path('p'));
    }

    // download a file
    protected async downloadFile(url: string, id: string): Promise<boolean> {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[error] Failed to fetch image ${url}`);
            return false;
        }
        try {
            fs.writeFileSync(path.join('public', `${id}.${RedditPost.getExtension(url)}`), Buffer.from(await response.arrayBuffer()));
            return true;
        } catch (error) {
            console.error(`[error] Failed to save image ${this.url}\n`, error);
            return false;
        }
    }

    // download contents associated with the post
    public async download(): Promise<boolean> {
        try {
            // image
            if (this.post_hint !== 'hosted:video') return await this.downloadFile(this.url, this.name);
            // video
            if (!((await this.downloadFile(this.url, this.name + 'video')) && (await this.downloadFile(this.getAudioUrl(), this.name + 'audio')) && (await this.prepareVideo()))) {
                console.error(`[error] Failed to download ${this.name}`);
                return false;
            }
            // wait and remove unnecessary files
            await sleep(1000);
            fs.unlinkSync(path.join('public', `${this.name}video.mp4`));
            await sleep(1000);
            fs.unlinkSync(path.join('public', `${this.name}audio.mp4`));
            return true;
        } catch (error) {
            console.error(`[error] Failed to remove extra files of ${this.name}\n`, error);
            return true;
        }
    }

    // concat the video and audio, resize, create cover image
    protected async prepareVideo(): Promise<boolean> {
        return new Promise((res) => {
            if (!this.bitrate_kbps) return false;
            try {
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
                    .takeScreenshots({
                        count: 1,
                        timemarks: ['0.0'],
                        filename: path.join('public', `${this.name}cover.png`),
                    })
                    .on('progress', (p) => console.log(`[info] Converting ${this.name}: ${Math.floor(p.percent)}%`))
                    .once('end', () => res(true))
                    .run();
            } catch (error) {
                console.log(`[error] Failed to convert ${this.name}\n`, error);
                return res(false);
            }
        });
    }

    protected getAudioUrl(): string {
        return this.url.replaceAll(/DASH_\d{2,5}/gm, 'DASH_audio');
    }

    public get cover(): string {
        return path.join('public', this.name + 'cover.png');
    }

    public static defaultCaption(title: string, author: string, url: string): string {
        return `${title}\nCredit to ${author}\n${url}`;
    }

    public async approve(caption: string, accountId: string, by: string) {
        this.account = accountId;
        this.accepted = true;
        this.accepted_by = by;
        this.accepted_at = Date.now();
        this.caption = caption;
        await this.update();
    }
}
