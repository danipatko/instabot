import dotenv from 'dotenv';
import { test } from './lib/tables';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { getLogin, postLogin, auth } from './pages/login';
import express, { NextFunction, Request, Response } from 'express';
import RedditQuery from './lib/reddit/query';
import { addQuery, getQuery, removeQuery, toggleQuery } from './pages/query';
import RedditFetch from './lib/reddit/fetch';
import RedditPost from './lib/reddit/post';

// KEY: 79c2c2ea790aa5484af3

dotenv.config();

// database tests
test();

const port = 3000;
const host = 'localhost';
const app = express();

// log incoming requests
const log = (req: Request, _: Response, next: NextFunction) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} (${req.ip})`);
    next();
};

app.use(log);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static('public'));
app.set('view engine', 'ejs');

app.get('/', auth, async (req, res) => {
    const q = await RedditQuery.fetch('0ec81967774c5b4c6bba');
    if (!q) return void res.status(404).send('not found');

    // const posts = await RedditFetch.fetchAll(q.url);
    // const p = posts.filter((p) => p.post_hint === 'hosted:video')[0];
    // console.log(p);

    // await p.save();

    const pending = await RedditPost.pending();
    console.log(pending);
    res.render('index', { foo: new Date().toLocaleTimeString(), pending });
});

app.get('/login', getLogin);
app.post('/login', postLogin);

app.get('/queries', getQuery);
app.post('/query/add', addQuery);
app.post('/query/:id/toggle', toggleQuery);
app.post('/query/:id/remove', removeQuery);

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
