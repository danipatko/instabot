import prisma from '../db.server';
import ev from 'events';
import { fetchPosts } from './fetch';
import logger from '../log.server';

export interface QueueItem {
    id: number;
    time: Date; // the next time for fetching
    name: string;
    timespan: number;
}

class Queue {
    private queue: QueueItem[] = [];
    private timer: NodeJS.Timer | null = null;
    public events = new ev.EventEmitter();

    constructor() {
        this.start();
    }

    // add new item from database
    public async enable(id: number) {
        const query = await prisma.fetch.findFirst({
            select: { id: true, timespan: true, sub: true, type: true },
            where: { id },
        });
        if (!query) return;
        this.queue = this.queue.filter((x) => x.id !== id);
        this.queue.push({
            ...query,
            time: new Date(Date.now() + query.timespan * 60 * 60 * 1000),
            name: `r/${query.sub}/${query.type}`,
        });
        this.refresh();
    }

    public disable(id: number) {
        this.queue = this.queue.filter((x) => x.id != id);
        this.refresh();
    }

    private sort() {
        this.queue.sort((a, b) => a.time.getTime() - b.time.getTime());
    }

    private refresh() {
        this.sort();
        this.waitForNext();
    }

    private tick() {
        const item = this.queue.shift();
        if (!item) return;
        this.queue.push({ ...item, time: new Date(Date.now() + item.timespan * 60 * 60 * 1000) });

        fetchPosts(item.id).catch(() => logger.warn(`Failed to fetch #${item.id}.`));
        this.refresh();
    }

    // start the timer
    private waitForNext() {
        if (this.timer) clearInterval(this.timer);
        const next = this.queue[0];
        if (!next) return;

        logger.info(`Waiting for next item '${next.name}' at ${next.time.toLocaleString()}`);
        this.timer = setTimeout(() => this.tick(), next.time.getTime() - Date.now());
    }

    private async start() {
        const all = await prisma.fetch.findMany({
            select: { id: true, timespan: true, sub: true, type: true },
            where: { enabled: true },
        });
        for (const query of all) {
            this.queue.push({
                ...query,
                time: new Date(Date.now() + query.timespan * 60 * 60 * 1000),
                name: `r/${query.sub}/${query.type}`,
            });
        }
        logger.info(`Loaded ${this.queue.length} queries from database. Refreshing...`);
        this.refresh();
    }

    public get state() {
        return this.queue;
    }
}

export default Queue;
