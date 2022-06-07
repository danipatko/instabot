import { IGAccount } from './account';

const RATE_LIMIT = 400; // number of actions under 24 hours to prevent API spam

export class ActivitySchedule {
    private static instance: ActivitySchedule;

    private constructor() {
        //
    }

    public static get _instance() {
        return this.instance || (this.instance = new this());
    }

    // private accounts: IGAccount[] = [];

    public account: IGAccount | null = null;
    public actions: number = 0;
    public maxActions: number = 0;

    public posts: number = 0;
    public follows: number = 0;

    public postRate: number = 0;
    public followRate: number = 0;

    public timeout: NodeJS.Timeout | null = null;
    public postInterval: NodeJS.Timer | null = null;
    public followInterval: NodeJS.Timer | null = null;

    // cycle for the next account
    public async next() {
        if (!this.account) return;
        this.maxActions = this.account.timespan * (RATE_LIMIT / 24);
        this.actions = 0;
        this.startPost();
        this.startFollow();

        this.postRate = this.account.timespan / (this.account.post_target + 1);
        this.followRate =
            this.account.timespan / (this.account.follow_target + 1);

        setTimeout(() => {
            this.stop();
            this.next();
        }, this.account.timespan * 60 * 60 * 1000);
    }

    // check if within rate limit
    public get canDo(): boolean {
        return this.actions < this.maxActions;
    }

    // clears the post and follow interval
    public stop() {
        if (this.postInterval) clearInterval(this.postInterval);
        if (this.followInterval) clearInterval(this.followInterval);
    }

    protected startPost() {
        this.postInterval = setInterval(() => {
            if (!this.canDo) return;
            console.log('posting');
            this.posts++;
            this.actions++;
        }, this.postRate);
    }

    protected startFollow() {
        this.followInterval = setInterval(() => {
            if (!this.canDo) return;
            console.log('following');
            this.posts++;
            this.actions++;
        }, this.followRate);
    }
}
