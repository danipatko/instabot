import ActivityCycle from '../lib/instagram/activity';
import { fetchPosts } from '../lib/reddit/fetch';
import Queue from '../lib/reddit/queue';
import prisma from '../lib/db';
import express from 'express';
import router from './routes';

// const q = new Queue();
// q.events.on('fetch', (id) => {
//     console.log('Fetch emitted');
//     // fetchPosts(id);
// });

const ac = new ActivityCycle();
ac.events.on('post', () => console.log('post'));
ac.events.on('follow', () => console.log('follow'));
ac.events.on('unfollow', () => console.log('unfollow'));
ac.events.on('login', () => console.log('login'));

ac.start();

const app = express();

app.use('/', express.static('./dist/client/'));

app.get('/test', async (req, res) => {
    const r = await fetchPosts(1);
    res.json(r);
});

app.get('/pog', async (req, res) => {
    const { id } = await prisma.fetch.create({
        data: {
            enabled: true,
            limit: 2,
            over_18: true,
            page_after: '',
            page_count: 0,
            page_reset: 10,
            sort: 'hot',
            sub: 'wordington',
            time: 'year',
            timespan: 0.001,
            type: 'hot',
        },
    });
    console.log(id);
    res.send('ok ' + id);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// @ts-ignore
import('./server/entry.mjs')
    .then(({ handler }) => {
        app.use(handler);
    })
    .catch((e) => console.log(`Cannot set astro middleware:\n${e}`));

app.use(router);

app.listen(3000, '0.0.0.0', () => console.log('Server listening on http://0.0.0.0:3000\n'));
