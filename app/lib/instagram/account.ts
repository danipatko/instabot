import { Feed, IgApiClient, IgCheckpointError } from 'instagram-private-api';
import { Account, IgUser } from '@prisma/client';
import { processPost } from '../reddit/fetch';
import ActivityCycle from './activity';
import { Promise } from 'bluebird';
import { promisify } from 'util';
import prisma from '../db.server';
import fs from 'fs';

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const exists = promisify(fs.exists);

const ig = new IgApiClient();

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const rng = (from: number, to: number) => Math.floor(from + Math.random() * (to - from));

interface IgUserPart {
    pk: number;
    username: string;
    fullname: string;
}

class Instagram {
    private account: Account | null = null;
    private following: number[] = [];
    private followBase: string | number = 'instagram';
    public ac: ActivityCycle;

    constructor() {
        const ac = new ActivityCycle();

        ac.events.removeAllListeners();
        ac.events.on('login', () => {
            console.log('Logging in to #%d', ac.currentAccount);
            this.loadAccount(ac.currentAccount).then((ok) => {
                if (!ok) ac.reset();
            });
        });
        ac.events.on('post', () => this.post());
        ac.events.on('follow', () => this.followNext());
        ac.events.on('unfollow', () => this.unfollowNext());

        this.ac = ac;
    }

    private async saveState() {
        const serialized = await ig.state.serialize();
        delete serialized.constants;
        // TODO: write always fails
        return write('session.json', JSON.stringify(serialized)).catch(() => console.log('Failed to save state.'));
    }

    private async login(username: string, password: string): Promise<boolean> {
        ig.state.generateDevice(username);
        return Promise.try(() => {
            ig.request.end$.subscribe(() => this.saveState());
            return exists('session.json').then(async (load) => {
                if (load) return ig.state.deserialize(await read('session.json'));
                else return ig.account.login(username, password);
            });
        })
            .then(() => true)
            .catch(IgCheckpointError, async () => {
                console.log(ig.state.checkpoint); // Checkpoint info here
                await ig.challenge.auto(true); // Requesting sms-code or click "It was me" button
                return false;
            })
            .catch((e) => {
                console.error(`Could not resolve checkpoint:\n${e}\n${e.stack}`);
                return false;
            });
    }

    private async publishPhoto(_path: string, caption: string) {
        return read(_path).then((file) => ig.publish.photo({ file, caption }));
    }

    private async publishVideo(_path: string, cover: string, caption: string) {
        return Promise.all([read(_path), read(cover)]).then(([video, coverImage]) =>
            ig.publish.video({
                video,
                caption,
                coverImage,
            })
        );
    }

    private async follow(id: string): Promise<boolean> {
        return ig.friendship
            .create(Number(id))
            .then(() => prisma.igUser.deleteMany({ where: { pk: id } }))
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to follow user ${id}.\n${e}`);
                return false;
            });
    }

    private async unfollow(id: string): Promise<boolean> {
        return ig.friendship
            .destroy(Number(id))
            .then(() => prisma.igUser.deleteMany({ where: { pk: id } }))
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to unfollow user ${id}.\n${e}`);
                return false;
            });
    }

    private async getFeedItems<T>(feed: Feed<any, T>, count: number = 100_000): Promise<T[]> {
        let items: T[] = [];
        do {
            items = items.concat(await feed.items());
        } while (items.length < count && feed.isMoreAvailable());
        return items;
    }

    private async findFollowersOf(id: number | string, noPrivate: boolean = false, count: number = 100): Promise<IgUserPart[]> {
        if (typeof id === 'string') {
            id = await ig.user.getIdByUsername(id);
        }

        const followersFeed = ig.feed.accountFollowers(id);
        return (await this.getFeedItems(followersFeed, count))
            .filter((u) => !noPrivate || !u.is_private)
            .map((u) => ({
                pk: u.pk,
                username: u.username,
                fullname: u.full_name,
            }));
    }

    private async updateFollowing() {
        const followingFeed = ig.feed.accountFollowing(ig.state.cookieUserId);
        this.following = (await this.getFeedItems(followingFeed, 100)).map((x) => x.pk);
    }

    private async updateToFollow() {
        if (!this.account) return;
        const account_id = this.account.id;
        const users = await this.findFollowersOf(this.followBase, true, 100);
        this.followBase = users[users.length - 1].pk;
        users.forEach(async (u) => {
            await prisma.igUser.create({ data: { ...u, account_id, pk: u.pk.toString() } });
        });
    }

    // PUBLIC

    public async logout(): Promise<void> {
        await ig.account.logout();
    }

    public async followNext(self = false) {
        if (!this.account) return;

        const user = await prisma.igUser.findFirst({
            select: { pk: true },
            orderBy: { created_at: 'asc' },
        });
        if (!user) {
            if (!self) {
                await this.updateToFollow();
                await this.followNext();
            }
            return;
        }
        await this.follow(user.pk);
    }

    public async unfollowNext(self = false): Promise<void> {
        if (!this.account) return;

        const user = this.following.pop();
        if (!user) {
            if (!self) {
                await this.updateFollowing();
                await this.unfollowNext(true);
            }
            return;
        }
        await this.unfollow(user.toString());
    }

    // process post from reddit then upload to instagram
    public async post(): Promise<Boolean> {
        if (!this.account) return false;

        return prisma.post
            .findFirst({
                include: { source: true },
                where: { account_id: this.account.id, uploaded: false },
                orderBy: { created_at: 'asc' },
            })
            .then((post) => {
                if (!post) throw new Error('Could not find any posts for uploading.');
                return Promise.all([processPost(post.source), post]);
            })
            .then(([file, post]) => {
                if (typeof file === 'string') return this.publishPhoto(file, post.caption);
                else return this.publishVideo(file[0], file[1], post.caption);
            })
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to publish post to instagram.\n${e}`);
                return false;
            });
    }

    public async loadAccount(id: number | undefined): Promise<boolean> {
        if (id === undefined) return false;
        if (this.account) {
            if (this.account.id === id) return true; // do not relogin
            await this.logout();
            await Promise.delay(rng(10_000, 20_000));
        }

        this.account = await prisma.account.findFirst({ where: { id } });
        if (!this.account) return false;

        return await this.login(this.account.username, this.account.password);
    }
}

export default Instagram;
