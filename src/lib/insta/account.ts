import Table from '../db/table';
import { randStr } from '../util';
import { readFileSync } from 'fs';
import QueryBuilder from '../db/builder';
import { AccountFollowersFeed, IgApiClient } from 'instagram-private-api';

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
    public account: InstaAccount | null = null;

    // public id: string;
    // public active: boolean;
    public actions: number = 0; // the number of actions done by this account
    // public username: string;
    // public password: string;
    // public timespan: number;
    public login_time: number = Date.now(); // the time the account was last logged in
    // public post_target: number;
    public follow_base?: string;
    // public follow_target: number;
    public followersFeed?: AccountFollowersFeed;
    public peopleToFollow: number[] = [];
    // public unfollow_target: number;

    private static instance: IGAccount;

    public static get _instance(): IGAccount {
        return this.instance || (this.instance = new this());
    }

    // public static create(username: string, password: string): IGAccount {
    //     return new IGAccount({
    //         id: randStr(20),
    //         active: true,
    //         username,
    //         password,
    //         timespan: 12,
    //         post_target: 0,
    //         follow_base: '',
    //         follow_target: 0,
    //         unfollow_target: 0,
    //     });
    // }

    public static async fetch(id: string): Promise<IGAccount | null> {
        const data = await instaAccounts.fetch(id);
        return data ? new IGAccount() : null;
    }

    public static async getDisplay(): Promise<InstaAccount[]> {
        return await instaAccounts.get(
            QueryBuilder.select<InstaAccount>('id', 'username').from(
                'igaccount'
            )
        );
    }

    public static async getAll(): Promise<InstaAccount[]> {
        return await instaAccounts.get(
            QueryBuilder.select<InstaAccount>().from('igaccount')
        );
    }

    private constructor(/* _: InstaAccount*/) {
        // this.id = _.id;
        // this.active = _.active;
        // this.username = _.username;
        // this.password = _.password;
        // this.timespan = _.timespan;
        // this.follow_base = _.follow_base;
        // this.post_target = _.post_target;
        // this.follow_target = _.follow_target;
        // this.unfollow_target = _.unfollow_target;
    }

    // log into instagram
    public async login() {
        try {
            await ig.simulate.preLoginFlow();
            await ig.account.login(this.username, this.password);
            this.actions = 0;
            this.login_time = Date.now();
            process.nextTick(async () => await ig.simulate.postLoginFlow());
        } catch (error) {
            console.error(
                `[error] Failed to log into account '${this.username}'`,
                error
            );
        }
    }

    // log out of current account
    public async logout() {
        const { status } = await ig.account.logout();
        console.log(`[info] logged out of account ${this.username}\n${status}`);
    }

    // publish a photo
    public async publishPhoto(
        file: string,
        caption: string
    ): Promise<string | null> {
        try {
            const buffer = Buffer.from(readFileSync(file));
            const res = await ig.publish.photo({
                file: buffer,
                caption,
            });
            console.log(
                `[info] Published photo '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`
            );
            return res.media.id;
        } catch (error) {
            console.error(`[error] Failed to publish photo '${file}'`, error);
            return null;
        }
    }

    // upload a video
    public async publishVideo(
        caption: string,
        file: string,
        cover: string
    ): Promise<string | null> {
        try {
            const videoBuf = Buffer.from(readFileSync(file));
            const coverBuf = Buffer.from(readFileSync(cover));
            const res = await ig.publish.video({
                video: videoBuf,
                caption,
                coverImage: coverBuf,
            });
            console.log(
                `[info] Published video '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`
            );
            return res.media.id;
        } catch (error) {
            console.error(`[error] Failed to publish video '${file}'`, error);
            return null;
        }
    }

    protected async follow(id: string | number) {
        await ig.friendship.create(id);
    }

    public async followNext() {
        const user = this.peopleToFollow.pop();
        user && (await this.follow(user));
    }

    protected async unfollow(id: string | number) {
        await ig.friendship.destroy(id);
    }

    protected async checkToFollow(): Promise<void> {
        // get the follower feed of an account by username
        if (!this.followersFeed) {
            const id = await ig.user.getIdByUsername(
                this.follow_base ?? 'instagram'
            );
            this.followersFeed = ig.feed.accountFollowers(id);
        }

        // if there are no people to follow, add more
        if (
            this.peopleToFollow.length == 0 &&
            this.followersFeed.isMoreAvailable()
        )
            for (const item of await this.followersFeed.items())
                this.peopleToFollow.unshift(item.pk);
    }

    // public async publishCarousel(files: { file: string; cover?: string }[], caption: string): Promise<string | null> {
    //     try {
    //         const res = await ig.publish.album({
    //             items: files.map(({ file, cover }) => {
    //                 const buffer = Buffer.from(readFileSync(file));
    //                 if (cover) return { file: buffer, video: buffer, cover: Buffer.from(readFileSync(cover)) };
    //                 return { file: buffer };
    //             }),
    //             caption,
    //         });
    //         console.log(`[info] Published album '${res?.media.caption}'\nStatus: ${res.status}\nMedia id: ${res?.media.id} | Upload id: ${res.upload_id}`);
    //         return res.media.id;
    //     } catch (error) {
    //         console.error(`[error] Failed to publish album '${JSON.stringify(files)}'\n`, error);
    //         return null;
    //     }
    // }

    public async save(): Promise<void> {
        await instaAccounts.insert(this);
    }

    public async update(): Promise<void> {
        await instaAccounts.update(this);
    }
}
