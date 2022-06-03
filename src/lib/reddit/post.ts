import fs from 'fs';
import path from 'path/posix';
import ffmpeg from 'fluent-ffmpeg';
import QueryBuilder from '../db/builder';
import { redditPostTable } from '../tables';
import { randStr } from '../util';

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
    media: null | { reddit_video: RedditVideo };
    secure_media: null | { reddit_video: RedditVideo };
    url: string;
}

export interface IRedditPost extends RedditPostBase {
    id: string;
    url: string;
    // media
    is_gif: boolean;
    duration?: number; // in seconds
    accepted: boolean; // can upload to insta
    accepted_by: string; // who marked it
    bitrate_kbps?: number;
}

const clamp = (num: number, min: number, max: number) =>
    Math.max(min, Math.min(max, num));

export default class RedditPost implements IRedditPost {
    public id: string;
    public ups: number;
    public url: string;
    public name: string;
    public downs: number;
    public title: string;
    public score: number;
    public author: string;
    public over_18: boolean;
    public is_gif: boolean;
    public is_video: boolean;
    public accepted: boolean;
    public duration?: number | undefined;
    public subreddit: string;
    public post_hint: 'hosted:video' | 'rich:video' | 'image' | 'self';
    public created_utc: number;
    public accepted_by: string;
    public num_comments: number;
    public upvote_ratio: number;
    public bitrate_kbps?: number | undefined;

    public constructor(data: RedditMediaPost) {
        this.url = data.url;
        this.ups = data.ups;
        this.is_gif = false;
        this.name = data.name;
        this.score = data.score;
        this.downs = data.downs;
        this.title = data.title;
        this.author = data.author;
        this.over_18 = data.over_18;
        this.is_video = data.is_video;
        this.post_hint = data.post_hint;
        this.subreddit = data.subreddit;
        this.created_utc = data.created_utc;
        this.upvote_ratio = data.upvote_ratio;
        this.num_comments = data.num_comments;

        this.id = randStr(20);
        this.accepted = false;
        this.accepted_by = '';

        if (data.post_hint !== 'hosted:video') return;

        if (data.media) {
            this.duration = data.media.reddit_video.duration;
            this.bitrate_kbps = data.media.reddit_video.bitrate_kbps;
            this.is_gif = data.media.reddit_video.is_gif;
            this.url = data.media.reddit_video.fallback_url;
        } else if (data.secure_media) {
            this.duration = data.secure_media.reddit_video.duration;
            this.bitrate_kbps = data.secure_media.reddit_video.bitrate_kbps;
            this.is_gif = data.secure_media.reddit_video.is_gif;
            this.url = data.secure_media.reddit_video.fallback_url;
        }
    }

    // fetch by id
    public static get = async (id: string) => await redditPostTable.fetch(id);

    // filter
    public static filter = async (query: QueryBuilder<IRedditPost>) =>
        await redditPostTable.get(query);

    // get unaccepted posts
    public static pending = async () =>
        await redditPostTable.get(
            QueryBuilder.select<IRedditPost>()
                .from('redditpost')
                .where('accepted')
                .is(0)
        );

    // save in database
    public async save() {
        await redditPostTable.insert({
            ...this,
            accepted: false,
            accepted_by: '',
        });
    }

    // remove from database
    public async remove() {
        await redditPostTable.remove(this.id);
    }

    ///// IO stuff

    // download a file
    protected async downloadFile(url: string, id: string) {
        const response = await fetch(url);
        if (!response.ok)
            return void console.error(`[error] Failed to fetch image ${url}`);

        try {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(
                path.join('public', `${id}.${this.getExtension(url)}`),
                buffer
            );
        } catch (error) {
            console.error(`[error] Failed to save image ${this.url}\n`, error);
        }
    }

    public async downloadVideo() {
        await this.downloadFile(this.url, this.name + 'video');
        await this.downloadFile(this.getAudioUrl(), this.name + 'audio');
    }

    public async concatAudio() {
        if (!this.bitrate_kbps) return;

        ffmpeg()
            .input(path.join('public', `${this.name}video.mp4`))
            .videoCodec('copy')
            .size('720x720') // 1:1 ratio
            .autopad(true, 'black') // create a black padding around the video
            .videoBitrate(clamp(this.bitrate_kbps, 2000, 4000) + 'k') // 3500 is recommended
            .input(path.join('public', `${this.name}audio.mp4`))
            .audioCodec('aac')
            .audioBitrate('256k')
            .output(path.join('public', `${this.name}.mp4`))
            .run(); // 256 is recommended
    }

    protected getExtension(url: string): string | null {
        const last = url.split('.').pop();
        if (!last) return null;
        return last.split('?')[0]; // fallback url has query params -> (...DASH_720.mp4?source=fallback)
    }

    protected getAudioUrl() {
        return this.url.replaceAll(/DASH_\d{2,5}/gm, 'DASH_audio');
    }
}
