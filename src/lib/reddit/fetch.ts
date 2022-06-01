import RedditPost, { IRedditPost } from './post';

export interface RedditQueryResult {
    data: {
        dist: number;
        children: { kind: string; data: IRedditPost }[];
    };
}

export default class RedditFetch {
    // fetch an array of posts
    public static async fetch(url: string): Promise<RedditQueryResult | null> {
        console.log(`[info] fetching ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(
                `[error] An error occured when fetching ${url}\n[${response.status}] ${response.statusText}`
            );
            return null;
        }

        // parse the result
        try {
            return (await response.json()) as RedditQueryResult;
        } catch (error) {
            console.error(
                `[error] An error occured when fetching ${url} (failed to retrieve json data)\n${error}`
            );
            return null;
        }
    }

    public static getPosts(result: RedditQueryResult): RedditPost[] {
        for (const post of result.data.children) {
        }

        return [];
    }
}
