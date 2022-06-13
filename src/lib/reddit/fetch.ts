import fetch from 'node-fetch';
import RedditQuery from './query';
import RedditPost, { RedditMediaPost } from './post';
import { Logs } from '../util';

export interface RedditQueryResult {
    data: {
        dist: number;
        children: { kind: string; data: RedditMediaPost }[];
    };
}

export default class RedditFetch {
    // fetch an array of posts
    public static async fetch(q: RedditQuery): Promise<RedditQueryResult | null> {
        Logs.info(`Fetching ${q.url}`);
        const response = await fetch(q.url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`[error] An error occured when fetching ${q.url}\n[${response.status}] ${response.statusText}`);
            return null;
        }

        // parse the result
        try {
            return (await response.json()) as RedditQueryResult;
        } catch (error) {
            console.error(`[error] An error occured when fetching ${q.url} (failed to retrieve json data)`, error);
            return null;
        }
    }

    // convert results to redditpost classes
    public static async fetchAll(q: RedditQuery): Promise<RedditPost[]> {
        const posts: RedditPost[] = [];
        const result = await this.fetch(q);
        if (!result) return posts;
        // save only media posts or the ones specified
        for (const { data } of result.data.children) {
            if ((q.accept_post_hint && data.post_hint === q.accept_post_hint) || data.post_hint === 'hosted:video' || data.post_hint === 'image') {
                posts.push(RedditPost.create({ ...data, account: q.account }));
            }
        }
        return posts;
    }
}
