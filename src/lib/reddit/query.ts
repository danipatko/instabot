import QB from '../db/builder';
import Table from '../db/table';

const REDDIT_HOST = 'https://reddit.com/';

export interface RedditQueryFilter {
    q?: string; // type must be search, ignored othewise
    t?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'; // the time the post was uploaded
    type?: 'hot' | 'new' | 'best' | 'search' | 'rising';
    sort?: 'top' | 'hot' | 'new' | 'comments' | 'relevance'; // only when searching
    _limit?: number;
    include_over_18?: 'on' | '';
}

export interface IRedditQuery extends RedditQueryFilter {
    id: string;
    enabled: 0 | 1;
    interval: number;
    subreddit: string;
    max_duration: number; // relevant for videos
    accept_post_hint?: 'hosted:video' | 'rich:video' | 'image'; // undefined -> accept any post except self
}

const queryTable = new Table<IRedditQuery>(
    'query',
    {
        id: 'VARCHAR(20) UNIQUE',
        q: 'VARCHAR(100)',
        t: 'VARCHAR(20)',
        type: 'VARCHAR(20)',
        sort: 'VARCHAR(20)',
        _limit: 'INTEGER',
        enabled: 'BOOLEAN',
        interval: 'INTEGER',
        subreddit: 'VARCHAR(100)',
        max_duration: 'INTEGER',
        include_over_18: 'BOOLEAN',
        accept_post_hint: 'VARCHAR(20)',
    }
    // true
);

export default class RedditQuery implements IRedditQuery {
    public q?: string; // type must be search, ignored othewise
    public t?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'; // the time the post was uploaded
    public id: string = '';
    public type?: 'hot' | 'new' | 'best' | 'search' | 'rising';
    public sort?: 'top' | 'hot' | 'new' | 'comments' | 'relevance'; // only when searching
    public _limit?: number;
    public enabled: 0 | 1 = 1;
    public interval: number = 0;
    public subreddit: string = '';
    public max_duration: number = 0;
    public include_over_18?: 'on' | '';
    public accept_post_hint?: 'hosted:video' | 'rich:video' | 'image';

    // get from db
    public static async fetch(id: string) {
        const raw = await queryTable.fetch(id);
        if (!raw) return null;
        return new RedditQuery(raw);
    }

    // parse filters
    public static from(filters: IRedditQuery) {
        return new RedditQuery(filters);
    }

    public async create() {
        await queryTable.insert(this);
    }

    public async update() {
        await queryTable.update(this);
    }

    public static async remove(id: string) {
        await queryTable.remove(id);
    }

    public static async getAll() {
        return await queryTable.get(QB.select<IRedditQuery>().from('query'));
    }

    private constructor(_: IRedditQuery) {
        this.q = _.q;
        this.t = _.t;
        this.id = _.id;
        this.sort = _.sort;
        this.type = _.type;
        this._limit = _._limit;
        this.enabled = _.enabled;
        this.interval = _.interval;
        this.subreddit = _.subreddit;
        this.max_duration = _.max_duration;
        this.include_over_18 = _.include_over_18;
        this.accept_post_hint = _.accept_post_hint;
    }

    public async toggle() {
        this.enabled = !this.enabled ? 1 : 0;
        await this.update();
    }

    // build the fetch string
    public get url(): string {
        let url = REDDIT_HOST + 'r/' + this.subreddit + '/';
        url += this.type + '.json';
        const { q, t, sort, _limit, include_over_18 } = this;

        const query = Object({ t, limit: _limit, include_over_18 });

        // search query
        if (this.type == 'search' && q) {
            query.q = q;
            query.sort = sort;
        }

        const params = new URLSearchParams(query).toString();
        if (params.length) url += '?' + params;
        return url;
    }
}
