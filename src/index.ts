import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import RedditPost from './lib/reddit/post';
import { IGAccount } from './lib/insta/account';
import { getLogin, postLogin, auth } from './pages/login';
import express, { NextFunction, Request, Response } from 'express';
import {
    addAccount,
    addKey,
    authOwner,
    getAccess,
    removeAccount,
    removeKey,
    toggleAccount,
    toggleActivity,
    toggleKey,
    updateAccount,
} from './pages/access';
import { addQuery, getQuery, removeQuery, toggleQuery } from './pages/query';
import { approvePost } from './pages';

// KEY: 5faf5ca381aa83509c4b

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
    res.render('index', { foo: new Date().toLocaleTimeString(), pending, accounts: await IGAccount.getDisplay() });
});

app.get('/login', getLogin);
app.post('/login', postLogin);

app.get('/access', authOwner, getAccess);
app.post('/access/new', authOwner, addKey);
app.post('/access/:id/toggle', authOwner, toggleKey);
app.post('/access/:id/remove', authOwner, removeKey);

app.post('/account/new', authOwner, addAccount);
app.post('/activity/toggle', authOwner, toggleActivity);
app.post('/account/:id/toggle', authOwner, toggleAccount);
app.post('/account/:id/remove', authOwner, removeAccount);
app.post('/account/:id/update', authOwner, updateAccount);

app.get('/queries', auth, getQuery);
app.post('/query/add', auth, addQuery);
app.post('/query/:id/toggle', auth, toggleQuery);
app.post('/query/:id/remove', auth, removeQuery);

app.post('/approve/:id', auth, approvePost);

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));

(async () => {
    // const acc = IGAccount.create('test', 'test');
    // await acc.save();

    await IGAccount.getDisplay();
})();
