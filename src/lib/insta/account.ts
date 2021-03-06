import Table from '../db/table';
import Bluebird from 'bluebird';
import { readFileSync } from 'fs';
import RedditPost from '../reddit/post';
import QueryBuilder from '../db/builder';
import { clamp, Logs, randStr, rng, sleep } from '../util';
import { AccountFollowersFeedResponseUsersItem, IgActionSpamError, IgApiClient, IgCheckpointError } from 'instagram-private-api';

// actions in 24 hours
const RATE_LIMIT = 300;

// one and only client
export const ig = new IgApiClient();

export interface IGActivity {
    timespan: number; // hours to be active
    post_target: number; // number of posts to publish
    follow_base: string; // id of an instagram account to follow its followers
    follow_target: number; // number of people to follow
    unfollow_target: number; // number of people to unfollow
}

export interface InstaAccount extends IGActivity {
    id: string;
    active: boolean;
    username: string;
    password: string;
}

const instaAccounts = new Table<InstaAccount>(
    'igaccount',
    {
        id: 'VARCHAR(20) UNIQUE',
        active: 'BOOLEAN',
        timespan: 'FLOAT',
        password: 'VARCHAR(100)',
        username: 'VARCHAR(100)',
        post_target: 'INTEGER',
        follow_base: 'VARCHAR(100)',
        follow_target: 'INTEGER',
        unfollow_target: 'INTEGER',
    }
    // true
);

export class IGAccount {
    private static instance: IGAccount;
    public static get _(): IGAccount {
        return this.instance || (this.instance = new this());
    }

    // get ids and usernames of accounts
    public static async getDisplay(): Promise<InstaAccount[]> {
        return await instaAccounts.get(QueryBuilder.select<InstaAccount>('id', 'username').from('igaccount'));
    }

    // get accounts with passwords
    public static async getAll(): Promise<InstaAccount[]> {
        return await instaAccounts.get(QueryBuilder.select<InstaAccount>().from('igaccount'));
    }

    // get accounts with passwords
    public static async getActive(): Promise<InstaAccount[]> {
        return await instaAccounts.get(QueryBuilder.select<InstaAccount>().from('igaccount').where('active').is(1));
    }

    public static async update(data: InstaAccount) {
        return await instaAccounts.update(data);
    }

    public static fetch = async (id: string) => await instaAccounts.fetch(id);

    public static async addAccount(username: string, password: string, timespan: number, post_target: number, follow_target: number) {
        const id = randStr(20);
        await instaAccounts.insert({
            id,
            active: true,
            username,
            password,
            timespan,
            post_target,
            follow_base: 'instagram',
            follow_target,
            unfollow_target: 0,
        });
    }

    public static async removeAccount(id: string) {
        await instaAccounts.remove(id);
    }

    private constructor() {
        this.refreshAccounts();
    }

    public reset() {
        this.posts = 0;
        this.actions = 0;
        this.current = null;
        this.follows = 0;
        this.timespan = 0;
        this.loginTime = 0;
        this.totalPosts = 0;
        this.totalFollows = 0;
        this.peopleToFollow = [];
    }

    public async reload(): Promise<void> {
        this.disable();
        this.reset();
        await this.refreshAccounts();
    }

    public enabled: boolean = false;
    public current: InstaAccount | null = null;
    private actions: number = 0; // the number of actions done by this account
    private maxActions: number = 0;
    public logs: string = '';

    // track the progress of the current account
    private totalPosts: number = 0;
    private posts: number = 0;
    private totalFollows: number = 0;
    private follows: number = 0;

    private timespan: number = 0;
    private loginTime: number = 0; // the time the account was last logged in
    private peopleToFollow: number[] = [];

    private accountCycle: string[] = [];

    protected postInterval: NodeJS.Timer | null = null;
    protected followInterval: NodeJS.Timer | null = null;
    protected activityTimeout: NodeJS.Timeout | null = null;

    public get elapsedTime(): number {
        return Date.now() - this.loginTime;
    }

    public get progress(): {} {
        return {
            posts: this.posts,
            follows: this.follows,
            actions: this.actions,
            accounts: this.accountCycle,
            totalTime: this.timespan,
            loginTime: this.loginTime,
            totalPosts: this.totalPosts,
            elapsedTime: this.elapsedTime,
            totalFollows: this.totalFollows,
        };
    }

    // log into instagram
    public static async login(id: string): Promise<boolean> {
        const account = await instaAccounts.fetch(id);
        if (!account) {
            Logs.info(`Login - Account '${id}' not found`);
            return false;
        }

        this.instance.current = account;
        this.instance.loginTime = Date.now();
        ig.state.generateDevice(account.username);

        // TODO: clean up
        return new Promise<boolean>(async (res) => {
            Bluebird.try(async () => {
                await ig.account.login(account.username, account.password);
                await sleep(rng(3, 6) * 1000);
                res(true);
            })
                .catch(IgCheckpointError, async () => {
                    console.log(ig.state.checkpoint); // Checkpoint info here
                    await ig.challenge.auto(true); // Requesting sms-code or click "It was me" button
                    res(false);
                })
                .catch((e) => {
                    Logs.error(`Could not resolve checkpoint:\n${e}\n${e.stack}`);
                    res(false);
                });
        });
    }

    // log out of current account
    public static async logout(): Promise<void> {
        await ig.account.logout();
        Logs.info(`Logged out of account '${this.instance.current?.username ?? 'unknown'}'`);
        this._.reset();
    }

    // publish a photo
    private async publishPhoto(file: string, caption: string): Promise<string | null> {
        try {
            const buffer = Buffer.from(readFileSync(file));
            const res = await ig.publish.photo({
                file: buffer,
                caption,
            });
            Logs.info(`Published photo\n${JSON.stringify(res)}`);
            this.posts++;

            return res?.media?.id ?? 'unknown';
        } catch (error) {
            Logs.error(`Failed to publish photo '${file}'\n${error}`);
            return null;
        }
    }

    // upload a video
    public async publishVideo(file: string, cover: string, caption: string): Promise<string | null> {
        try {
            const videoBuf = Buffer.from(readFileSync(file));
            const coverBuf = Buffer.from(readFileSync(cover));
            const res = await ig.publish.video({
                video: videoBuf,
                caption,
                coverImage: coverBuf,
            });
            Logs.info(`Published video '${file}'\n${JSON.stringify(res)}`);
            this.posts++;

            return res?.media?.id ?? 'unknown';
        } catch (error) {
            Logs.error(`Failed to publish video '${file}', ${error}`);
            return null;
        }
    }

    private async follow(id: string | number): Promise<void> {
        try {
            Logs.info(`Attempting to follow ${id}`);
            await ig.friendship.create(id);
            this.follows++;
        } catch (error) {
            Logs.info(`Failed to follow ${id}\n${error}`);
            await sleep(rng(30, 60) * 60 * 1000);
        }
    }

    private unfollow = async (id: string | number) => await ig.friendship.destroy(id);

    // follow a person (this might take 30-40 minutes to prevent further API spam errors)
    private async followNext(): Promise<void> {
        this.actions++;
        await this.checkToFollow();
        const user = this.peopleToFollow.pop();
        user && (await this.follow(user));
    }

    // create a post
    private async postNext(): Promise<void> {
        const post = await RedditPost.nextUploadable();
        if (!post) return void Logs.info(`PostNext - No post available for uploading.`);

        Logs.info(`Attempting to publish post '${post.title}'`);
        this.actions++;
        const caption = RedditPost.defaultCaption(post.title, post.author, post.url);

        if (post.post_hint === 'image') await this.publishPhoto(post.file, post.caption.length ? post.caption : caption);
        else await this.publishVideo(post.file, post.cover, post.caption.length ? post.caption : caption);

        Logs.info(`Published post '${post.title}'`);
        post.uploaded = true;
        await post.update();
    }

    private async checkToFollow(): Promise<void> {
        if (!this.current || this.current.follow_target < 1 || this.peopleToFollow.length > 0) return;

        // check if id is the user pk
        let id = parseInt(this.current.follow_base);
        // id is a username
        if (isNaN(id)) id = await ig.user.getIdByUsername(this.current.follow_base ?? 'instagram'); // default: people following @instagram
        const followersFeed = ig.feed.accountFollowers(id);

        Logs.info(`Fetching people to follow (followers of ${id})`);

        let currentPage: AccountFollowersFeedResponseUsersItem[] = [];
        do {
            currentPage = await followersFeed.items();
            this.peopleToFollow = [...this.peopleToFollow, ...currentPage.map((u) => u.pk)];
            // prevent api spam
            await sleep(rng(2000, 5000));
        } while (this.peopleToFollow.length > this.current.follow_target && followersFeed.isMoreAvailable());

        if (this.peopleToFollow.length > 0) {
            this.current.follow_base = this.peopleToFollow[this.peopleToFollow.length - 1].toString();
            await IGAccount.update(this.current);
        }
    }

    private async refreshAccounts(): Promise<void> {
        this.accountCycle = (await IGAccount.getActive()).map((a) => a.id);
    }

    public async restart(): Promise<void> {
        this.stopActivity();
        await this.nextAccount();
        await this.startActivity();
    }

    // log into the next acount in the cycle
    public async nextAccount(): Promise<void> {
        Logs.info(`Logging into next account`);
        this.reset();

        // there is only one/no account -> don't log out and log back in
        if (this.accountCycle.length < 2 && this.current) return void Logs.info(`There is only ${this.accountCycle.length} account. Skipping relogin.`);

        const id = this.accountCycle.shift();
        if (!id) return void Logs.error('NextAccount - No accounts available.');
        this.accountCycle.push(id);

        await IGAccount.logout();
        if (!(await IGAccount.login(id))) {
            this.disable();
            Logs.error(`NextAccount - Could not log into account '${id}'`);
        }
    }

    // start posting and following
    private async startActivity(): Promise<void> {
        // no active accounts in cycle
        if (!this.accountCycle.length) {
            this.enabled = false;
            return void Logs.error('StartActivity - No active accounts. May need to update account list.');
        }

        if (this.current) this.current = await instaAccounts.fetch(this.current.id);
        // if there is no current account, log into the first one
        else await this.nextAccount();

        // no active account
        if (!this.current) {
            this.enabled = false;
            return void Logs.error('StartActivity - No current account.');
        }

        // the loop has been restarted
        this.timespan =
            this.actions != 0 // has been already started
                ? this.current.timespan * 60 * 60 * 1000 - this.elapsedTime
                : this.current.timespan * 60 * 60 * 1000;

        // number of actions that can be done under this timespan
        this.maxActions = Math.floor(this.current.timespan * (RATE_LIMIT / 24));

        // number of posts
        this.totalPosts = clamp(this.current.post_target, 0, this.maxActions) - this.posts;
        if (this.totalPosts > 0)
            this.postInterval = setInterval(async () => {
                if (this.posts >= this.totalPosts && this.postInterval) return void clearInterval(this.postInterval);
                await this.postNext();
            }, this.timespan / (this.totalPosts + 1));

        // posts are prioritized over following
        this.totalFollows = clamp(this.current.follow_target, 0, Math.min(this.maxActions - this.totalPosts, this.current.follow_target)) - this.follows;
        if (this.totalFollows > 0)
            this.followInterval = setInterval(async () => {
                if (this.follows >= this.totalFollows && this.followInterval) return void clearInterval(this.followInterval);
                await this.followNext();
            }, this.timespan / (this.totalFollows + 1));

        Logs.info(
            `StartActivity - ${this.current.username} will be active for ${this.timespan / 1000 / 60 / 60} hours.\nMax actions: ${this.maxActions}\nPosts: ${
                this.totalPosts
            }\nFollows: ${this.totalFollows}`
        );

        // start a timeout
        this.activityTimeout = setTimeout(async () => {
            this.stopActivity();
            await this.nextAccount();
            await this.startActivity();
        }, this.timespan);
    }

    private stopActivity(): void {
        this.postInterval && clearInterval(this.postInterval);
        this.followInterval && clearInterval(this.followInterval);
        this.activityTimeout && clearTimeout(this.activityTimeout);
    }

    public async enable(): Promise<void> {
        this.enabled = true;
        await this.startActivity();
    }

    public disable() {
        this.enabled = false;
        this.stopActivity();
    }
}
