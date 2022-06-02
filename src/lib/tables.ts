import Table from './db/table';
import { IRedditPost, RedditPostBase } from './reddit/post';

// run('DROP TABLE IF EXISTS admin');
interface AccessKeyTable {
    id: string;
    tag: string;
    added: number;
    valid: 0 | 1;
}

const accessKeys = new Table<AccessKeyTable>('admin', {
    id: 'VARCHAR(20) UNIQUE PRIMARY KEY',
    tag: 'TEXT',
    added: 'INTEGER', // epoch timestamp
    valid: 'BOOLEAN',
});

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
    over18: 'BOOLEAN',
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

export { accessKeys, AccessKeyTable, RedditPostBase, redditPostTable };
