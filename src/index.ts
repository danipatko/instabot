import dotenv from 'dotenv';
import { test } from './lib/tables';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import RedditPost from './lib/reddit/post';
import RedditQuery from './lib/reddit/query';
import RedditFetch from './lib/reddit/fetch';
import { getLogin, postLogin, auth } from './pages/login';
import express, { NextFunction, Request, Response } from 'express';
import { addQuery, getQuery, removeQuery, toggleQuery } from './pages/query';

// KEY: 70cb1d33ba2649c3d09f

dotenv.config();

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
    // const q = await RedditQuery.fetch('998f7c81b7cb0f763249');
    // if (!q) return;

    // const posts = await RedditFetch.fetchAll(q);
    // const p = posts.filter(async (p) => p.post_hint === 'hosted:video')[0];
    // await p.save();

    const pending = await RedditPost.pending();
    // console.log(pending);
    res.render('index', { foo: new Date().toLocaleTimeString(), pending });
});

app.get('/login', getLogin);
app.post('/login', postLogin);

app.get('/queries', getQuery);
app.post('/query/add', addQuery);
app.post('/query/:id/toggle', toggleQuery);
app.post('/query/:id/remove', removeQuery);

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));

// database tests
test();
