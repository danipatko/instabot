import { redditPostTable } from '../tables';
import { IRedditVideo } from './media';

export interface IRedditPost {
    id: string;
    ups: number;
    downs: number;
    score: number; // = ups - downs
    title: string;
    author: string;
    over18: boolean;
    is_video: boolean;
    accepted: boolean; // can upload to insta
    subreddit: string;
    post_hint:
        | 'hosted:video' // normal video
        | 'rich:video' // e.g. a youtube embed
        | 'image'; // simple image
    created_utc: number;
    accepted_by: boolean; // who marked it
    upvote_ratio: number;
    num_comments: number;
    media: null | IRedditVideo;
}

export default class RedditPost {
    public data: IRedditPost;

    public constructor(data: IRedditPost) {
        this.data = data;
    }

    // save in database
    public async save() {
        await redditPostTable.insert(this.data);
    }

    // remove from database
    public async remove() {
        await redditPostTable.remove(this.data.id);
    }

    // check for media
    public async downloadMedia() {
        if (!(this.data.is_video && this.data.post_hint === 'hosted:video')) {
            console.log(
                `[info] Video cannot be downloaded. post_hint=${this.data.post_hint}`
            );
        }
    }
}
