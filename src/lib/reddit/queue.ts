import { Logs, rng, sleep } from '../util';
import RedditFetch from './fetch';
import RedditQuery from './query';

export interface QueueItem {
    id: string;
    time: Date; // the next time for fetching
    name: string;
    interval: number;
}

export default class Queue {
    public items: QueueItem[] = [];
    private timer: NodeJS.Timer | null;
    private onTick: (item: QueueItem) => void;

    constructor(onTick: (item: QueueItem) => void | Promise<void>) {
        this.items = [];
        this.timer = null;
        this.onTick = onTick;
    }

    // add new item from database
    public async add(id: string) {
        const query = await RedditQuery.fetch(id);
        if (!query) return;
        this.items.push({ id, time: new Date(Date.now() + query.interval * 60 * 60 * 1000), name: `${query.subreddit} ${query.type}`, interval: query.interval });
        this.refresh();
    }

    protected sort() {
        this.items.sort((a, b) => a.time.getTime() - b.time.getTime());
    }

    // remove a specific query from the queue
    public disable(id: string) {
        for (let i = 0; i < this.items.length; i++) if (this.items[i].id === id) this.items.splice(i, 1);
        this.refresh();
    }

    protected refresh() {
        this.sort();
        this.waitForNext();
    }

    protected tick() {
        const [item] = this.items.splice(0, 1); // remove the first item
        if (!item) return;

        Logs.info(`Fetch - Tick at item ${item.id} - ${item.name};`);
        this.items.push({ ...item, time: new Date(Date.now() + item.interval * 60 * 60 * 1000) });
        this.refresh();
        this.onTick(item);
    }

    // start the timer
    protected waitForNext() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        const next = this.items[0];
        if (!next) return;

        Logs.info(`Fetch - Waiting for next item '${next.name}' at ${next.time.toLocaleString()}`);
        this.timer = setTimeout(() => this.tick(), next.time.getTime() - Date.now());
    }

    // get all queries from the database and sort
    public static init(onTick: (item: QueueItem) => void): Queue {
        const queue = new Queue(onTick);
        RedditQuery.getAll().then((queries) => {
            for (const query of queries)
                if (query.enabled)
                    queue.items.push({
                        id: query.id,
                        time: new Date(Date.now() + query.interval * 60 * 60 * 1000), // query.interval is in hours
                        name: `${query.subreddit} - ${query.type}`,
                        interval: query.interval,
                    });
            queue.refresh();
        });
        return queue;
    }
}

let isProcessing = false;

const queue: Queue = Queue.init(async (item) => {
    const q = await RedditQuery.fetch(item.id);
    if (!q) return;

    // prevent overloading
    while (isProcessing) await sleep(60_000);

    const posts = await RedditFetch.fetchAll(q);
    isProcessing = true;
    for (const post of posts) {
        await post.save();
        await sleep(rng(30_000, 60_000)); // wait before processing next post (ffmpeg is a heavy task)
    }
    isProcessing = false;

    const last = posts.pop();
    last && (await q.nextPage(last.name));
});

export { queue };
