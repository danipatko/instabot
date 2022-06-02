const REDDIT_HOST = 'https://reddit.com/';

export type RedditQueryFilter = {
    [key: string]: any;
    q?: string; // search query
    t?: 'hour' | 'day' | 'week' | 'month' | 'year'; // the time the post was uploaded
    sort?: 'top' | 'hot' | 'new' | 'comments' | 'relevance';
    include_over_18?: 'on'; // nsfw posts
};

export default class RedditQuery {
    private type: 'hot' | 'new' | 'best' | 'search' = 'hot';
    private filters: RedditQueryFilter = {};
    private subreddit: string;

    public static create(sub: string): RedditQuery {
        return new RedditQuery(sub);
    }

    private constructor(sub: string) {
        this.subreddit = sub;
    }

    // search
    public search(phrase: string) {
        this.filters.q = phrase;
        this.type = 'search';
        return this;
    }

    // sort
    public sort(by: 'top' | 'hot' | 'new' | 'comments' | 'relevance') {
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
    public in(type: 'hot' | 'new' | 'best') {
        this.type = type;
        return this;
    }

    // build the fetch string
    public build(): string {
        let url = REDDIT_HOST + 'r/' + this.subreddit + '/';
        url += this.type + '.json';
        const params = new URLSearchParams(this.filters).toString();
        if (params.length) url += '?' + params;
        return url;
    }
}
