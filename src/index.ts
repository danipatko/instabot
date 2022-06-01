import express from 'express';
import sqlite3 from 'sqlite3';
import RedditQuery from './lib/reddit/query';

const db = new sqlite3.Database(
    'sqlite.db',
    sqlite3.OPEN_READWRITE,
    (err) =>
        err && console.error(`[error] Failed to connect to database \n${err}`)
);
console.log('got here');
db.close();

const port = 3000;
const host = 'localhost';

const app = express();

app.get('/', (req, res) => {
    const q = RedditQuery.create('retarb')
        .search('dog')
        .sort('relevance')
        .build();
    console.log(q);
    res.send('bruah');
});

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
