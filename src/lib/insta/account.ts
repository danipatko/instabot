import Table from '../db/table';
import { readFileSync } from 'fs';
import QueryBuilder from '../db/builder';
import { AccountFollowersFeed, IgApiClient } from 'instagram-private-api';
import { clamp, randStr, rng, sleep } from '../util';
import RedditPost from '../reddit/post';
import path from 'path/posix';

const RATE_LIMIT = 400;

// one and only client
export const ig = new IgApiClient();

export interface IGActivity {
    timespan: number; // hours to be active
    post_target: number; // number of posts to publish
    follow_base?: string; // id of an instagram account to follow its followers
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
        timespan: 'INTEGER',
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
    public static get _instance(): IGAccount {
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

    public static async update(data: InstaAccount) {
        return await instaAccounts.update(data);
    }

    public static fetch = async (id: string) => await instaAccounts.fetch(id);

    public static async addAccount(
        username: string,
        password: string,
        timespan: number,
        post_target: number,
        follow_target: number
    ) {
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
        this._instance.enableAccount(id);
    }

    public static async removeAccount(id: string) {
        await instaAccounts.remove(id);
        this._instance.disableAccount(id);
    }

    private constructor() {
        this.refreshAccounts();
    }

    public async reset() {
        this.actions = 0;
        this.current = null;
        this.loginTime = 0;
        this.accountCycle = [];
        this.followersFeed = undefined;
        this.peopleToFollow = [];
    }

    public enabled: boolean = false;
    public current: InstaAccount | null = null;
    private actions: number = 0; // the number of actions done by this account
    private maxActions: number = 0;

    // track the progress of the current account
    private totalPosts: number = 0;
    private posts: number = 0;
    private totalFollows: number = 0;
    private follows: number = 0;

    private loginTime: number = Date.now(); // the time the account was last logged in
    private followersFeed?: AccountFollowersFeed;
    private peopleToFollow: number[] = [];

    private accountCycle: string[] = [];

    protected postInterval: NodeJS.Timeout | null = null;
    protected followInterval: NodeJS.Timeout | null = null;

    public get elapsedTime(): number {
        return Date.now() - this.loginTime;
    }

    public get progress(): {} {
        return {
            posts: this.posts,
            follows: this.follows,
            actions: this.actions,
            loginTime: this.loginTime,
            totalPosts: this.totalPosts,
            elapsedTime: this.elapsedTime,
            totalFollows: this.totalFollows,
        };
    }

    // log into instagram
    public static async login(id: string) {
        const account = await instaAccounts.fetch(id);
        if (!account) return void console.error(`[error] account '${id}' not found`);
        this.instance.current = account;
        this.instance.loginTime = Date.now();
        // try {
        //     await ig.simulate.preLoginFlow();
        //     await ig.account.login(account.username, account.password);
        //     process.nextTick(async () => await ig.simulate.postLoginFlow());
        // } catch (error) {
        //     console.error(`[error] Failed to log into account '${account.username}'`, error);
        // }
    }

    // log out of current account
    public static async logout() {
        // const { status } = await ig.account.logout();
        // console.log(`[info] logged out of account ${this._instance.current?.username}\n${status}`);
        this._instance.current = null;
    }

    // publish a photo
    private async publishPhoto(file: string, caption: string): Promise<string | null> {
        // try {
        //     const buffer = Buffer.from(readFileSync(file));
        //     const res = await ig.publish.photo({
        //         file: buffer,
        //         caption,
        //     });
        //     console.log(`[info] Published photo '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`);
        //     return res.media.id;
        // } catch (error) {
        //     console.error(`[error] Failed to publish photo '${file}'`, error);
        //     return null;
        // }
        return null;
    }

    // upload a video
    private async publishVideo(caption: string, file: string, cover: string): Promise<string | null> {
        // try {
        //     const videoBuf = Buffer.from(readFileSync(file));
        //     const coverBuf = Buffer.from(readFileSync(cover));
        //     const res = await ig.publish.video({
        //         video: videoBuf,
        //         caption,
        //         coverImage: coverBuf,
        //     });
        //     console.log(`[info] Published video '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`);
        //     return res.media.id;
        // } catch (error) {
        //     console.error(`[error] Failed to publish video '${file}'`, error);
        //     return null;
        // }
        return null;
    }

    private follow = async (id: string | number) => console.log('FOLLOW ', id) /* await ig.friendship.create(id)*/;

    private unfollow = async (id: string | number) => await ig.friendship.destroy(id);

    // follow a person
    private async followNext() {
        // if(this.actions)
        await this.checkToFollow();
        const user = this.peopleToFollow.pop();
        user && (await this.follow(user));
    }

    // create a post
    private async postNext() {
        const post = await RedditPost.nextUploadable();
        if (!post) return;
        if (post.post_hint === 'image') await this.publishPhoto(post.file, post.title);
        else await this.publishVideo(post.title, post.file, post.cover);

        console.log(`[info] Posted '${post.title}'`);
        post.uploaded = true;
        await post.update();
    }

    private async checkToFollow() {
        // get the follower feed of an account by username
        if (!this.followersFeed) {
            // const id = await ig.user.getIdByUsername(this.current?.follow_base ?? 'instagram'); // default: people following instagram
            // this.followersFeed = ig.feed.accountFollowers(id);
        }
        // if there are no people to follow, add more
        // if (this.peopleToFollow.length == 0 && this.followersFeed.isMoreAvailable()) for (const item of await this.followersFeed.items()) this.peopleToFollow.unshift(item.pk);
    }

    private async refreshAccounts() {
        this.accountCycle = (await IGAccount.getAll()).map((a) => a.id);
    }

    // remove an account from the cycle
    public async disableAccount(id: string) {
        this.accountCycle = this.accountCycle.filter((a) => a != id);
        if (this.current?.id == id) await IGAccount.nextAccount();
    }

    // add an account to the cycle
    public enableAccount(id: string) {
        this.accountCycle.push(id);
    }

    // log into the next acount in the cycle
    public static async nextAccount() {
        const id = this._instance.accountCycle.shift();
        if (!id) return;
        this._instance.accountCycle.push(id);
        this._instance.current = await instaAccounts.fetch(id);

        // await this.logout();
        // await sleep(rng(10_000, 20_000));
        // await this.login(id);
    }

    // start posting and following
    private async startActivity() {
        while (!this.current) {
            await this.refreshAccounts();
            await IGAccount.nextAccount();
        }
        // the loop has been restarted
        const timespan =
            this.actions != 0 // has been already started
                ? this.current.timespan * 60 * 60 * 1000 - this.elapsedTime
                : this.current.timespan * 60 * 60 * 1000;

        this.maxActions = this.current.timespan * (RATE_LIMIT / 24);
        // priorize posting over following
        this.totalPosts = clamp(this.current.post_target, 0, this.maxActions) - this.posts;
        const postRate = this.totalPosts / timespan;

        this.totalFollows =
            clamp(
                this.current.follow_target,
                0,
                Math.min(this.maxActions - this.totalPosts, this.current.follow_target)
            ) - this.follows;
        const followRate = this.totalFollows / timespan;

        this.postInterval = setInterval(
            /* this.postNext*/ () => {
                console.log('POSTING');
            },
            postRate
        );
        this.followInterval = setInterval(
            /*this.followNext*/ () => {
                console.log('FOLLOWING');
            },
            followRate
        );
    }

    private stopActivity() {
        this.postInterval && clearInterval(this.postInterval);
        this.followInterval && clearInterval(this.followInterval);
    }

    public async enable() {
        this.enabled = true;
        await this.startActivity();
    }

    public disable() {
        this.enabled = false;
        this.stopActivity();
    }
}
