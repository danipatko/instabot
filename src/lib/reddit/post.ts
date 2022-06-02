import fs from 'fs';
import path from 'path/posix';
import ffmpeg from 'fluent-ffmpeg';
import QueryBuilder from '../db/builder';
import { redditPostTable } from '../tables';

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
    over18: boolean;
    is_video: boolean;
    subreddit: string;
    post_hint:
        | 'hosted:video' // normal video
        | 'rich:video' // e.g. a youtube embed
        | 'image'; // simple image
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

const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(max, num));

export default class RedditPost {
    public data: IRedditPost;

    public constructor(data: RedditMediaPost) {
        this.data = {
            ...data,
            id: '',
            is_gif: false,
            accepted: false,
            accepted_by: '',
        };

        if (data.post_hint === 'hosted:video') {
            if (data.media) this.data = { ...this.data, ...data.media.reddit_video, url: data.media.reddit_video.fallback_url };
            else if (data.secure_media) this.data = { ...this.data, ...data.secure_media.reddit_video, url: data.secure_media.reddit_video.fallback_url };
            else console.error(`[error] Failed to parse reddit post ${data.name}`);
        }
    }

    // fetch by id
    public static get = async (id: string) => await redditPostTable.fetch(id);

    // filter
    public static filter = async (query: QueryBuilder<IRedditPost>) => await redditPostTable.get(query);

    // get unaccepted posts
    public static pending = async () => await redditPostTable.get(QueryBuilder.select<IRedditPost>().from('redditpost').where('accepted').is(0));

    // save in database
    public async save() {
        await redditPostTable.insert({
            ...this.data,
            accepted: false,
            accepted_by: '',
        });
    }

    // remove from database
    public async remove() {
        await redditPostTable.remove(this.data.id);
    }

    ///// IO stuff

    // download a file
    protected async downloadFile(url: string, id: string) {
        const response = await fetch(url);
        if (!response.ok) return void console.error(`[error] Failed to fetch image ${url}`);

        try {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(path.join('public', `${id}.${this.getExtension(url)}`), buffer);
        } catch (error) {
            console.error(`[error] Failed to save image ${this.data.url}\n`, error);
        }
    }

    public async downloadVideo() {
        await this.downloadFile(this.data.url, this.data.name + 'video');
        await this.downloadFile(this.getAudioUrl(), this.data.name + 'audio');
    }

    public async concatAudio() {
        if (!this.data.bitrate_kbps) return;

        ffmpeg()
            .input(path.join('public', `${this.data.name}video.mp4`))
            .videoCodec('copy')
            .size('720x720') // 1:1 ratio
            .autopad(true, 'black') // create a black padding around the video
            .videoBitrate(clamp(this.data.bitrate_kbps, 2000, 4000) + 'k') // 3500 is recommended
            .input(path.join('public', `${this.data.name}audio.mp4`))
            .audioCodec('aac')
            .audioBitrate('256k')
            .output(path.join('public', `${this.data.name}.mp4`))
            .run(); // 256 is recommended
    }

    protected getExtension(url: string): string | null {
        const last = url.split('.').pop();
        if (!last) return null;
        return last.split('?')[0]; // fallback url has query params -> (...DASH_720.mp4?source=fallback)
    }

    protected getAudioUrl() {
        return this.data.url.replaceAll(/DASH_\d{2,5}/gm, 'DASH_audio');
    }
}
