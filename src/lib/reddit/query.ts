import QB from '../db/builder';
import Table from '../db/table';
import { randStr } from '../util';

const REDDIT_HOST = 'https://reddit.com/';

export interface RedditQueryFilter {
    // [key: string]: any;
    q?: string; // search query
    t?: 'hour' | 'day' | 'week' | 'month' | 'year'; // the time the post was uploaded
    id: string;
    type?: 'hot' | 'new' | 'best' | 'search';
    sort?: 'top' | 'hot' | 'new' | 'comments' | 'relevance';
    subreddit: string;
    include_over_18?: 'on' | ''; // nsfw posts
}

const queryTable = new Table<RedditQueryFilter>('query', {
    id: 'VARCHAR(20) UNIQUE',
    q: 'VARCHAR(100)',
    t: 'VARCHAR(20)',
    type: 'VARCHAR(20)',
    sort: 'VARCHAR(20)',
    subreddit: 'VARCHAR(100)',
    include_over_18: 'BOOLEAN',
});

export default class RedditQuery {
    private filters: RedditQueryFilter = { subreddit: '', id: '' };

    // get from db
    public static async fetch(id: string) {
        return await queryTable.fetch(id);
    }

    // parse filters
    public static from(filters: RedditQueryFilter) {
        return new RedditQuery(filters.subreddit, filters);
    }

    public async create() {
        await queryTable.insert(this.filters);
    }

    public async update() {
        await queryTable.update(this.filters);
    }

    public static async getAll() {
        return await queryTable.get(
            QB.select<RedditQueryFilter>().from('query')
        );
    }

    ///// wrappers

    public static sub(sub: string): RedditQuery {
        return new RedditQuery(sub);
    }

    private constructor(subreddit: string, filters?: RedditQueryFilter) {
        this.filters = { ...filters, subreddit, id: randStr(20) };
    }

    // search
    public search(phrase: string) {
        this.filters.q = phrase;
        this.filters.type = 'search';
        return this;
    }

    // sort
    public sortBy(by: 'top' | 'hot' | 'new' | 'comments' | 'relevance') {
        this.filters.sort = by;
        return this;
    }

    // uploaded
    public inTheLast(time: 'hour' | 'day' | 'week' | 'month' | 'year') {
        this.filters.t = time;
        return this;
    }

    // allow nsfw posts (disabled by default)
    public nsfw() {
        this.filters.include_over_18 = 'on';
        return this;
    }

    // set type
    public from(type: 'hot' | 'new' | 'best') {
        this.filters.type = type;
        return this;
    }

    // build the fetch string
    protected get query(): string {
        let url = REDDIT_HOST + 'r/' + this.filters.subreddit + '/';
        url += this.filters.type + '.json';
        const { id, subreddit, type, ...rest } = this.filters;

        const params = new URLSearchParams({ ...rest }).toString();
        if (params.length) url += '?' + params;
        return url;
    }
}
