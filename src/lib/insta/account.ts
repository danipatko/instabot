import Table from '../db/table';
import { readFileSync } from 'fs';
import QueryBuilder from '../db/builder';
import { AccountFollowersFeed, IgApiClient } from 'instagram-private-api';
import { clamp, rng, sleep } from '../util';
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

const instaAccounts = new Table<InstaAccount>('igaccount', {
    id: 'VARCHAR(20) UNIQUE',
    active: 'BOOLEAN',
    timespan: 'INTEGER',
    password: 'VARCHAR(100)',
    username: 'VARCHAR(100)',
    post_target: 'INTEGER',
    follow_base: 'VARCHAR(100)',
    follow_target: 'INTEGER',
    unfollow_target: 'INTEGER',
});

export class IGAccount {
    private static instance: IGAccount;
    public static get _instance(): IGAccount {
        return this.instance || (this.instance = new this());
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

    public current: InstaAccount | null = null;

    public actions: number = 0; // the number of actions done by this account
    public loginTime: number = Date.now(); // the time the account was last logged in
    public followersFeed?: AccountFollowersFeed;
    public peopleToFollow: number[] = [];

    public accountCycle: string[] = [];
    public accountCycleIndex: number = 0;

    protected postInterval: NodeJS.Timeout | null = null;
    protected followInterval: NodeJS.Timeout | null = null;

    // get ids and usernames of accounts
    public static async getDisplay(): Promise<InstaAccount[]> {
        return await instaAccounts.get(QueryBuilder.select<InstaAccount>('id', 'username').from('igaccount'));
    }

    // get accounts with passwords
    public static async getAll(): Promise<InstaAccount[]> {
        return await instaAccounts.get(QueryBuilder.select<InstaAccount>().from('igaccount'));
    }

    // log into instagram
    public static async login(id: string) {
        const account = await instaAccounts.fetch(id);
        if (!account) return void console.error(`[error] account '${id}' not found`);
        this._instance.current = account;
        try {
            await ig.simulate.preLoginFlow();
            await ig.account.login(account.username, account.password);
            process.nextTick(async () => await ig.simulate.postLoginFlow());
        } catch (error) {
            console.error(`[error] Failed to log into account '${account.username}'`, error);
        }
    }

    // log out of current account
    public async logout() {
        const { status } = await ig.account.logout();
        console.log(`[info] logged out of account ${this.current?.username}\n${status}`);
        this.current = null;
    }

    // publish a photo
    public async publishPhoto(file: string, caption: string): Promise<string | null> {
        try {
            const buffer = Buffer.from(readFileSync(file));
            const res = await ig.publish.photo({
                file: buffer,
                caption,
            });
            console.log(`[info] Published photo '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`);
            return res.media.id;
        } catch (error) {
            console.error(`[error] Failed to publish photo '${file}'`, error);
            return null;
        }
    }

    // upload a video
    public async publishVideo(caption: string, file: string, cover: string): Promise<string | null> {
        try {
            const videoBuf = Buffer.from(readFileSync(file));
            const coverBuf = Buffer.from(readFileSync(cover));
            const res = await ig.publish.video({
                video: videoBuf,
                caption,
                coverImage: coverBuf,
            });
            console.log(`[info] Published video '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`);
            return res.media.id;
        } catch (error) {
            console.error(`[error] Failed to publish video '${file}'`, error);
            return null;
        }
    }

    protected follow = async (id: string | number) => await ig.friendship.create(id);

    protected unfollow = async (id: string | number) => await ig.friendship.destroy(id);

    // follow a person
    public async followNext() {
        await this.checkToFollow();
        const user = this.peopleToFollow.pop();
        user && (await this.follow(user));
    }

    // create a post
    public async postNext() {
        const post = await RedditPost.nextUploadable();
        if (!post) return;
        if (post.post_hint === 'image') await this.publishPhoto(post.file, post.title);
        else await this.publishVideo(post.title, post.file, post.cover);

        console.log(`[info] Posted '${post.title}'`);
        post.uploaded = true;
        await post.update();
    }

    protected async checkToFollow() {
        // get the follower feed of an account by username
        if (!this.followersFeed) {
            const id = await ig.user.getIdByUsername(this.current?.follow_base ?? 'instagram'); // default: people following instagram
            this.followersFeed = ig.feed.accountFollowers(id);
        }
        // if there are no people to follow, add more
        if (this.peopleToFollow.length == 0 && this.followersFeed.isMoreAvailable()) for (const item of await this.followersFeed.items()) this.peopleToFollow.unshift(item.pk);
    }

    public async save() {
        this.current && (await instaAccounts.insert(this.current));
    }

    public async update() {
        this.current && (await instaAccounts.update(this.current));
    }

    private async refreshAccounts() {
        this.accountCycle = (await IGAccount.getAll()).map((a) => a.id);
    }

    // remove an account from the cycle
    public static removeAccount(id: string) {
        this._instance.accountCycle = this._instance.accountCycle.filter((a) => a != id);
        if (this._instance.current?.id == id) this.nextAccount();
    }

    // add an account to the cycle
    public static addAccount(id: string) {
        this._instance.accountCycle.push(id);
    }

    // log into the next acount in the cycle
    public static async nextAccount() {
        const id = this._instance.accountCycle[++this._instance.accountCycleIndex % this._instance.accountCycle.length];
        this._instance.current = await instaAccounts.fetch(id);
        await this._instance.logout();
        await sleep(rng(5000, 10000));
        await this.login(id);
    }

    public async doActivity() {
        while (!this.current) {
            await this.refreshAccounts();
            await IGAccount.nextAccount();
        }
        const timespan = this.current.timespan * 60 * 60 * 1000;
        const maxActions = this.current.timespan * (RATE_LIMIT / 24);
        // priorize posting over following
        const numberOfPosts = clamp(this.current.post_target, 0, maxActions);
        const postRate = numberOfPosts / timespan;

        const numberOfFollows = clamp(this.current.follow_target, 0, Math.min(maxActions - numberOfPosts, this.current.follow_target));
        const followRate = numberOfFollows / timespan;

        this.postInterval = setInterval(this.postNext, postRate);
        this.followInterval = setInterval(this.followNext, followRate);
    }
}
