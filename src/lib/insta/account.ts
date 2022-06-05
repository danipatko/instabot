import QueryBuilder from '../db/builder';
import Table from '../db/table';
import { randStr } from '../util';

export interface InstaAccount {
    id: string;
    username: string;
    password: string;
}

export const instaAccounts = new Table<InstaAccount>('igaccount', {
    id: 'VARCHAR(20) UNIQUE',
    password: 'VARCHAR(100)',
    username: 'VARCHAR(100)',
});

export class IGAccount implements InstaAccount {
    public id: string;
    public username: string;
    public password: string;

    public static create(username: string, password: string): IGAccount {
        return new IGAccount({ id: randStr(20), username, password });
    }

    public static async getAll(): Promise<InstaAccount[]> {
        const res = await instaAccounts.get(QueryBuilder.select<InstaAccount>('id', 'username').from('igaccount'));
        console.log(res);
        return res;
    }

    private constructor(_: InstaAccount) {
        this.id = _.id;
        this.username = _.username;
        this.password = _.password;
    }

    public async save(): Promise<void> {
        await instaAccounts.insert(this);
    }

    public async update(): Promise<void> {
        await instaAccounts.update(this);
    }
}
