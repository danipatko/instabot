import { Activity } from '@prisma/client';
import prisma from '../db';
import ev from 'events';

const halfMinInHours = 1 / 2 / 60;

interface Account {
    id: number;
    username: string;
    activity: Activity;
}

class AccountQueue {
    public current: Account | null = null;

    private async getLeastUsed() {
        console.log(await prisma.account.findMany({ select: { username: true }, orderBy: { last_used: 'asc' } }));

        this.current = (await prisma.account.findFirst({
            select: { id: true, username: true, activity: true },
            where: { NOT: { activity: null } },
            orderBy: { last_used: 'asc' },
        })) as Account | null;
    }

    private async updateLastUsed() {
        console.log(`Updating ${this.current?.id}`);
        if (this.current) await prisma.account.update({ data: { last_used: new Date() }, where: { id: this.current.id } });
    }

    // update current or try to load last used
    public async update() {
        if (this.current) {
            this.current = (await prisma.account.findFirst({
                select: { id: true, username: true, activity: true },
                where: { id: this.current.id, NOT: { activity: null } },
            })) as Account;
        } else {
            await this.getLeastUsed();
        }
    }

    public async next() {
        await this.updateLastUsed(); // mark time of last usage
        await this.getLeastUsed(); // load next (or the same)
    }
}

interface Progress {
    done: number; // completed actions
    total: number; // number of actions
    interval: number; // hours between actions
    next: number; // hours until next action
}

class Timer {
    private timer: NodeJS.Timer | null = null;
    private timings: Map<string, Progress> = new Map();
    private timeStarted: number = 0; // unix timestamp
    private timeStopped: number = 0; // unix timestamp

    public events: ev.EventEmitter = new ev.EventEmitter();
    public enabled: boolean = false;

    public set(key: string, timer: Progress) {
        this.timings.set(key, timer);
    }

    public clear(key: string) {
        this.timings.delete(key);
    }

    public clearAll() {
        this.timings.clear();
        this.events.removeAllListeners();
    }

    private cycle() {
        const elapsed = (Date.now() - this.timeStarted) / (1000 * 60 * 60); // in hours
        console.log(`Elapsed: ${elapsed}`);
        console.log(this.timings.size);
        this.timings.forEach((t, k) => {
            const next = t.interval * (t.done + 1);
            console.log(`Next tick for ${k}: ${next}`);
            if (next + halfMinInHours > elapsed && elapsed > next - halfMinInHours && t.done < t.total) {
                t.done++;
                this.events.emit(k);
            }
            t.next = next;
            this.timings.set(k, { ...t });
        });
    }

    public start(first = true) {
        if (this.enabled) return;
        this.enabled = true;

        if (first) this.timeStarted = Date.now();
        else this.timeStarted = this.timeStarted + (Date.now() - this.timeStopped);

        this.timer = setInterval(() => this.cycle(), 60 * 1000);
    }

    public stop() {
        if (!this.enabled) return;
        this.enabled = false;

        this.timeStopped = Date.now();
        this.timer && clearInterval(this.timer);
    }

    public resume() {
        this.start(false);
    }

    public reset() {
        this.stop();
        this.clearAll();
        this.timeStarted = 0;
        this.timeStopped = 0;
    }

    public get progress() {
        return {
            elapsed: (Date.now() - this.timeStarted) / (1000 * 60 * 60),
            enabled: this.enabled,
            timings: Object.fromEntries(this.timings),
        };
    }
}

class ActivityCycle {
    private timer: Timer = new Timer();
    private accountQueue: AccountQueue = new AccountQueue();
    private halted: boolean = false;

    private getInterval(timespan: number, total: number) {
        return timespan / (total + 1);
    }

    private getProgress(activity: Activity) {
        return {
            post: {
                done: 0,
                next: 0,
                total: activity.post_target,
                interval: this.getInterval(activity.timespan, activity.post_target),
            },
            follow: {
                done: 0,
                next: 0,
                total: activity.follow_target,
                interval: this.getInterval(activity.timespan, activity.follow_target),
            },
            unfollow: {
                done: 0,
                next: 0,
                total: activity.unfollow_target,
                interval: this.getInterval(activity.timespan, activity.unfollow_target),
            },
        };
    }

    public async start() {
        const account = this.accountQueue.current;
        if (!account) return void console.log('No accounts in queue.');

        if (this.halted) {
            this.halted = false;
            this.timer.resume();
            return;
        }

        // events
        this.timer.clearAll();
        this.timer.set('account', { done: 0, interval: account.activity.timespan, next: account.activity.timespan, total: 1 });
        this.timer.events.on('account', () => this.next());

        const progress = this.getProgress(account.activity);
        this.timer.set('post', progress.post);
        this.timer.set('follow', progress.follow);
        this.timer.set('unfollow', progress.unfollow);

        this.timer.start();
    }

    public stop() {
        this.timer.stop();
        this.halted = true;
    }

    public reset() {
        this.accountQueue.current = null;
        this.timer.reset();
        this.halted = false;
    }

    public async update() {
        this.stop();
        await this.accountQueue.update();
    }

    public async next() {
        this.reset();
        await this.accountQueue.next();
        this.timer.events.emit('login');
        this.start();
    }

    public get events() {
        return this.timer.events;
    }

    public get state() {
        return {
            ...this.timer.progress,
            account: this.accountQueue.current?.username,
            timepsan: this.accountQueue.current?.activity.timespan,
        };
    }

    public get currentAccount(): number | undefined {
        return this.accountQueue.current?.id;
    }
}

export default ActivityCycle;
