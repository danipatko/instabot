import { exec, run } from './db';
import Table from './db/table';
import { IRedditPost, RedditPostBase } from './reddit/post';

const redditPostTable = new Table<IRedditPost>('redditpost', {
    id: 'VARCHAR(20) UNIQUE PRIMARY KEY',
    ups: 'INTEGER',
    url: 'TEXT',
    name: 'VARCHAR(30)',
    title: 'TEXT',
    score: 'INTEGER',
    downs: 'INTEGER',
    is_gif: 'BOOLEAN',
    author: 'VARCHAR(120)',
    over_18: 'BOOLEAN',
    duration: 'INTEGER',
    is_video: 'BOOLEAN',
    accepted: 'BOOLEAN',
    subreddit: 'VARCHAR(60)',
    post_hint: 'VARCHAR(60)',
    created_utc: 'INTEGER',
    accepted_by: 'VARCHAR(20)',
    upvote_ratio: 'REAL',
    num_comments: 'INTEGER',
    bitrate_kbps: 'INTEGER',
});

export const test = async () => {
    // await run('DROP TABLE admin');
    /* await accessKeys.insert({
        added: Date.now(),
        id: 'admin',
        tag: 'main key',
        valid: 1,
    }); // */
    // console.log('added to table');
    // const nonexistant = await accessKeys.fetch('admin');
    // console.log(nonexistant);
};

export * from './db/tables/accesskeys';
export { RedditPostBase, redditPostTable };
