import { IRedditVideo } from './media';

export interface IRedditPost {
    ups: number;
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
    media: null | IRedditVideo;
}

export default class RedditPost {
    public data: IRedditPost;

    public constructor(data: IRedditPost) {
        this.data = data;
    }
}
