import QueryBuilder from './builder';
import { each, get, run } from './index';

interface Row {
    id: string;
}

export default class Table<T extends Row> {
    protected name: string;

    public constructor(name: string, properties: Record<keyof T, string>, drop?: boolean) {
        this.name = name;
        // clear table
        if (drop) run('DROP TABLE IF EXISTS ' + name).then(() => this.create(properties));
        else this.create(properties);
    }

    // create new table if it doesn't exist already
    protected async create(properties: Record<keyof T, string>) {
        const table =
            'CREATE TABLE IF NOT EXISTS ' +
            this.name +
            ' (' +
            Object.entries(properties)
                .map(([field, type]) => field + ' ' + type)
                .join(', ') +
            ')';
        if (!(await run(table))) console.error(`[error] Failed to create table '${this.name}'`);
    }

    // instert a new row
    public async insert(data: T) {
        const keys = Object.keys(data);
        const insert =
            'INSERT OR IGNORE INTO ' +
            this.name +
            ' (' +
            keys.join(',') +
            ') VALUES (' +
            Array.from(keys)
                .map((_) => '?')
                .join(',') +
            ')';
        if (!(await run(insert, ...Object.values(data)))) console.error(`[error] Failed to insert into table '${this.name}'`);
    }

    // update all params in a single row by id
    public async update(data: T) {
        const { id, ...rest } = data;
        const items = Object.entries(rest).filter(([k, v]) => k != id && (typeof v == 'number' || typeof v == 'string' || typeof v == 'boolean'));

        const update = 'UPDATE ' + this.name + ' SET ' + items.map((x) => x[0] + '=?').join(',') + ' WHERE id = ?';
        if (!(await run(update, ...items.map((x) => x[1]), id))) console.error(`[error] Failed to update table '${this.name}'`);
    }

    // get a single row by id
    public async fetch(id: string): Promise<T | null> {
        return await get<T>(`SELECT * FROM ${this.name} WHERE id = ?`, id);
    }

    // get multiple rows
    public async get(builder: QueryBuilder<T>): Promise<T[]> {
        return await each<T>(builder.query);
    }

    // drop entire table
    public async drop() {
        return await run(`DROP TABLE IF EXISTS ${this.name}`);
    }

    // remove by id
    public async remove(id: string) {
        return await run(`DELETE FROM ${this.name} WHERE id = ?`, id);
    }
}
