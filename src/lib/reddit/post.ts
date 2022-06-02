import fs from 'fs';
import path from 'path/posix';
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

        if (data.post_hint === 'hosted:video' && data.media)
            this.data = {
                ...this.data,
                ...data.media.reddit_video,
                url: data.media.reddit_video.fallback_url,
            };
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
        if (!response.ok)
            return void console.error(`[error] Failed to fetch image ${url}`);

        try {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(
                path.join('public', `${id}.${this.getExtension(url)}`),
                buffer
            );
        } catch (error) {
            console.error(
                `[error] Failed to save image ${this.data.url}\n`,
                error
            );
        }
    }

    public async downloadVideo() {
        await this.downloadFile(this.data.url, this.data.name + 'video');
        await this.downloadFile(this.getAudioUrl(), this.data.name + 'audio');
    }

    public async concatAudio(name: string) {
        throw 'xd';
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
