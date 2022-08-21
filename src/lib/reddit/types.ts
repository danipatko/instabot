import type { Source } from '@prisma/client';

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

const convert = (_: RedditMediaPost) => {
    return {
        ups: _.ups,
        url: _.url,
        file: '',
        name: _.name,
        downs: _.downs,
        score: _.score,
        title: _.title,
        author: _.author,
        archived: false,
        subreddit: _.subreddit,
        post_hint: _.post_hint,
        created_utc: _.created_utc,
        num_comments: _.num_comments,
        upvote_ratio: _.upvote_ratio,
    };
};

export { convert };
export type { RedditMediaPost, RedditQueryResult, RedditVideo, RedditPostBase };
