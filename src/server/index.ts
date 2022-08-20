import express from 'express';
import router from './routes';
import ActivityCycle from '../lib/activity';

const ac = new ActivityCycle();

ac.start();

ac.events.on('post', () => console.log('post'));
ac.events.on('follow', () => console.log('follow'));
ac.events.on('unfollow', () => console.log('unfollow'));
ac.events.on('login', () => console.log('login'));

const app = express();

app.use('/', express.static('./dist/client/'));

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
