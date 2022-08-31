import { AccountFollowersFeedResponseUsersItem, IgApiClient, IgCheckpointError } from 'instagram-private-api';
import { Promise } from 'bluebird';
import { promisify } from 'util';
import fs from 'fs';
import { Account } from '@prisma/client';

const read = promisify(fs.readFile);

const ig = new IgApiClient();

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const rng = (from: number, to: number) => Math.floor(from + Math.random() * (to - from));

class Instagram {
    private toFollow: number[] = [];
    private toUnfollow: number[] = [];
    private account: Account | null = null;

    public async login(username: string, password: string): Promise<boolean> {
        ig.state.generateDevice(username);
        return Promise.try(() => ig.account.login(username, password))
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

    public async logout(): Promise<void> {
        await ig.account.logout();
    }

    private async publishPhoto(_path: string, caption: string): Promise<boolean> {
        return read(_path)
            .then((file) => ig.publish.photo({ file, caption }))
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to publish photo ${_path} to instagram.\n${e}`);
                return false;
            });
    }

    private async publishVideo(_path: string, cover: string, caption: string): Promise<boolean> {
        return Promise.all([read(_path), read(cover)])
            .then(([video, coverImage]) =>
                ig.publish.video({
                    video,
                    caption,
                    coverImage,
                })
            )
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to publish photo ${_path} to instagram.\n${e}`);
                return false;
            });
    }

    private async follow(id: number): Promise<boolean> {
        return ig.friendship
            .create(id)
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to follow user ${id}.\n${e}`);
                return false;
            });
    }

    private async unfollow(id: number): Promise<boolean> {
        return ig.friendship
            .destroy(id)
            .then(() => true)
            .catch((e) => {
                console.error(`Failed to unfollow user ${id}.\n${e}`);
                return false;
            });
    }

    private async findFollowersOf(id: number | string, count: number = 100): Promise<number[]> {
        if (typeof id === 'string') {
            id = await ig.user.getIdByUsername(id);
        }

        const followersFeed = ig.feed.accountFollowers(id);
        let page: AccountFollowersFeedResponseUsersItem[] = [];
        let found: number[] = [];
        do {
            page = await followersFeed.items().catch(() => []);
            found = [...found, ...page.map((u) => u.pk)];
            await sleep(rng(2000, 5000));
        } while (found.length < count && followersFeed.isMoreAvailable());

        return found;
    }

    private a() {}
}

export default Instagram;
