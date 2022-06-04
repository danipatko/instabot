import RedditQuery from './reddit/query';

export interface QueueItem {
    id: string;
    time: Date; // the next time for fetching
    name: string;
    interval: number;
}

export default class Queue {
    public items: QueueItem[];
    public timer: NodeJS.Timer | null;
    public onTick: (item: QueueItem) => void;

    constructor(onTick: (item: QueueItem) => void) {
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

    public refresh() {
        this.sort();
        this.waitForNext();
    }

    public tick() {
        const [item] = this.items.splice(0, 1); // remove the first item
        if (!item) return;
        console.log(`[info] tick at item ${item.id} - ${item.name}`);
        this.items.push({ ...item, time: new Date(Date.now() + item.interval * 60 * 60 * 1000) });
        this.refresh();
        this.onTick(item);
    }

    // start the timer
    public waitForNext() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        const next = this.items[0];
        if (!next) return;

        console.log(`[info] waiting for next item '${next.name}' at ${next.time.toLocaleString()}`);
        this.timer = setTimeout(this.tick, next.time.getTime() - Date.now());
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

export const queue: Queue = Queue.init((item) => {
    console.log('---');
    console.log(item);
});
