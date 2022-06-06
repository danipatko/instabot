import Table from '../db/table';
import { randStr } from '../util';
import QueryBuilder from '../db/builder';
import { IgApiClient } from 'instagram-private-api';
import { readFileSync } from 'fs';

// how many actions can an account do in 24 hours
const CLIENT_ACTION_RATE = 400 / (24 * 60 * 60 * 1000);

// one and only client
export const ig = new IgApiClient();

export interface IGActivity {
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
    password: 'VARCHAR(100)',
    username: 'VARCHAR(100)',
    post_target: 'INTEGER',
    follow_base: 'VARCHAR(100)',
    follow_target: 'INTEGER',
    unfollow_target: 'INTEGER',
});

export class IGAccount implements InstaAccount {
    public id: string;
    public active: boolean;
    public actions: number = 0; // the number of actions done by this account
    public username: string;
    public password: string;
    public login_time: number = Date.now(); // the time the account was last logged in
    public post_target: number;
    public follow_base?: string;
    public follow_target: number;
    public unfollow_target: number;

    public static create(username: string, password: string): IGAccount {
        return new IGAccount({ id: randStr(20), username, password, active: true, follow_target: 0, post_target: 0, unfollow_target: 0, follow_base: '' });
    }

    public static async fetch(id: string): Promise<IGAccount | null> {
        const data = await instaAccounts.fetch(id);
        if (!data) return null;
        return new IGAccount(data);
    }

    public static async getAll(): Promise<InstaAccount[]> {
        return await instaAccounts.get(QueryBuilder.select<InstaAccount>('id', 'username').from('igaccount'));
    }

    private constructor(_: InstaAccount) {
        this.id = _.id;
        this.active = _.active;
        this.username = _.username;
        this.password = _.password;
        this.follow_base = _.follow_base;
        this.post_target = _.post_target;
        this.follow_target = _.follow_target;
        this.unfollow_target = _.unfollow_target;
    }

    // check if inside of rate limit
    public rateOk(): boolean {
        return this.actions / (Date.now() - this.login_time) < CLIENT_ACTION_RATE;
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
            console.error(`[error] Failed to log into account '${this.username}'`, error);
        }
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
