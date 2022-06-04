import { exec, get } from './db';
import Table from './db/table';
import QueryBuilder from './db/builder';

export interface AccessKey {
    id: string;
    tag: string;
    added: number;
    valid: 0 | 1;
    readonly owner: 0 | 1; // is owner key
}

export const accessKeys = new Table<AccessKey>(
    'admin',
    {
        id: 'VARCHAR(20) UNIQUE',
        tag: 'TEXT',
        added: 'INTEGER', // epoch timestamp
        valid: 'BOOLEAN',
        owner: 'BOOLEAN',
    }
    // true
);

export default class AccessKeys {
    // get an access key directly
    static async isValid(id: string): Promise<boolean> {
        return (await exec<{ count: number }>('SELECT COUNT(*) as count FROM admin WHERE id = ? AND valid = 1', id))?.count > 0;
    }

    // check if there is any key
    static async anyKey(): Promise<boolean> {
        return (await exec<{ count: number }>('SELECT COUNT(*) as count FROM admin')).count > 0;
    }

    // check if key is the owner
    static async isOwner(id: string | undefined): Promise<boolean> {
        return id !== undefined && (await exec<{ count: number }>('SELECT COUNT(*) as count FROM admin WHERE id = ? AND owner = 1', id)).count > 0;
    }

    // get all access keys
    static async getKeys(): Promise<AccessKey[]> {
        return await accessKeys.get(QueryBuilder.select().from('admin'));
    }

    // update a key
    static async updateKey(key: AccessKey) {
        await accessKeys.update(key);
    }

    // add new key
    static async addKey(key: AccessKey) {
        await accessKeys.insert({ ...key });
    }
}
