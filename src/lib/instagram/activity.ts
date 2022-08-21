import type { BaseActivity } from '../db';
import prisma from '../db';
import ev from 'events';

interface Timespan {
    time: number;
    posts: number;
    follows: number;
    unfollows: number;
    postInterval: number;
    followInterval: number;
    unfollowInterval: number;
}

class ActivityCycle {
    private halted: boolean = false;
    private enabled: boolean = false;

    private firstStart: boolean = true;
    // loaded from db
    private currentActivity: BaseActivity | null = null;
    private currentAccount: { username: string; password: string } | null = null;

    private activityQueue: number[] = [];
    private timespan: Timespan | null = null;

    private startTime: number = 0;
    private haltTime: number = 0;
    public events = new ev.EventEmitter();
    private interval: NodeJS.Timer | null = null;

    private async setQueue() {
        const data = await prisma.account.findMany({
            select: { id: true, activity_id: true },
            // (first start -> unused account : latest)
            orderBy: { activity: { last_used: this.firstStart ? 'asc' : 'desc' } },
            where: { NOT: { activity: null } },
        });
        // no item in the queue has an activity
        if (!data.some((x) => x.activity_id !== null || x.activity_id !== undefined)) {
            console.log('No accounts in this queue have activities.');
            return void (this.enabled = false);
        }
        this.activityQueue = data.map((x) => x.id);
    }

    private async loadAccount(self = false): Promise<void> {
        if (!this.enabled) return void console.log('Activity cycle is disabled. Aborting...');
        if (this.activityQueue.length === 0) return void console.log('No accounts in queue');

        const data = await prisma.account.findFirst({
            select: {
                username: true,
                password: true,
                activity: { select: { id: true, timespan: true, follow_target: true, post_target: true, unfollow_target: true } },
            },
            where: { id: this.activityQueue[0], NOT: { activity: null } },
        });

        if (!(data && data.activity)) {
            if (self) return void console.log('Failed to update queue, aborting...');
            console.log('Cannot find queued account in database or activity is missing. Updating queue...');

            await this.setQueue();
            return void this.loadAccount(true);
        }

        console.log(`Loading activity of ${data.username}.`);
        const { activity, ...creds } = data;
        this.currentAccount = creds;
        this.currentActivity = activity;

        this.events.emit('login', this.currentAccount);
        this.calculateTimespan();
    }

    private calculateTimespan() {
        if (!this.currentActivity) return void console.log('No current activity.');
        const ts = this.currentActivity.timespan;
        this.timespan = {
            time: ts,
            posts: 0,
            follows: 0,
            unfollows: 0,
            postInterval: Math.floor(ts / this.currentActivity.post_target + 1),
            followInterval: Math.floor(ts / this.currentActivity.follow_target + 1),
            unfollowInterval: Math.floor(ts / this.currentActivity.unfollow_target + 1),
        };
    }

    private cycle(halt = false) {
        if (!this.timespan) return;
        this.startTime = halt ? this.startTime + (Date.now() - this.haltTime) : Date.now();
        this.interval = setInterval(this.check, 60 * 1000); // every minute
    }

    private check() {
        if (!this.timespan) return void console.log('No timespan.');
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

        if (elapsed > this.timespan.time * 1000) {
            return void this.next();
        }

        const postTime = this.timespan.postInterval * (this.timespan.posts + 1);
        if (elapsed + 30 > postTime && postTime > elapsed * 30) {
            this.events.emit('post');
            this.timespan.posts++;
        }

        const followTime = this.timespan.followInterval * (this.timespan.follows + 1);
        if (elapsed + 30 > followTime && followTime > elapsed * 30) {
            this.events.emit('follow');
            this.timespan.follows++;
        }

        const unfollowTime = this.timespan.unfollowInterval * (this.timespan.unfollows + 1);
        if (elapsed + 30 > unfollowTime && unfollowTime > elapsed * 30) {
            this.events.emit('unfollow');
            this.timespan.unfollows++;
        }
    }

    public async next() {
        const current = this.activityQueue.shift();
        if (!(current && this.currentActivity)) return void (this.enabled = false);
        await prisma.activity.update({ data: { last_used: new Date() }, where: { id: this.currentActivity.id } });
        this.halted = false;
        this.start();
    }

    public async start() {
        this.enabled = true;
        if (!this.halted) {
            await this.setQueue();
            await this.loadAccount();
        }
        this.cycle(this.halted);
        this.halted = false;
        this.firstStart = false;
    }

    public halt() {
        this.halted = true;
        this.enabled = false;
        this.haltTime = Date.now();
        if (this.interval) clearInterval(this.interval);
    }

    public reset() {
        this.halted = false;
        this.enabled = false;
        if (this.interval) clearInterval(this.interval);
    }
}

export default ActivityCycle;
