import sqlite3 from 'sqlite3';

// connect to database
const db = new sqlite3.Database('sqlite.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) console.error(`[error] Failed to connect to database \n${err}`);
    else console.log('[info] Connected to database');
});

// run a single command. returns true if successful
const run = (sql: string, ...params: any[]): Promise<boolean> =>
    new Promise((resolve) => {
        console.log(`[info] Running query '${sql}'`);
        db.run(sql, params, (err) => {
            if (err !== null) console.error(`[error] Failed to run query \n${err}`);
            resolve(err === null);
        });
    });

// get a single row
const get = <T>(sql: string, ...params: any[]): Promise<T | null> =>
    new Promise((resolve) => {
        console.log(`[info] Running query '${sql}'`);
        db.get(sql, params, (err, row) => {
            if (err) console.error(`[error] Failed to get row \n${err}`);
            resolve(row ? (row as T) : null);
        });
    });

// get multiple rows
const each = <T>(sql: string, ...params: any[]): Promise<T[]> =>
    new Promise<T[]>((resolve) => {
        console.log(`[info] Running query '${sql}'`);
        db.all(sql, params, (err, rows) => {
            if (err || !rows) {
                console.error(`[error] Failed to get rows \n${err}`);
                return void resolve([]);
            }
            resolve(rows as T[]);
        });
    });

const close = () => {};

export { run, get, each, close };
