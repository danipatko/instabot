import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { approvePost } from './pages';
import cookieParser from 'cookie-parser';
import RedditPost from './lib/reddit/post';
import { IGAccount } from './lib/insta/account';
import { getLogin, postLogin, auth } from './pages/login';
import express, { NextFunction, Request, Response } from 'express';
import { addQuery, getQuery, removeQuery, toggleQuery } from './pages/query';
import { addAccount, addKey, authOwner, getAccess, removeAccount, removeKey, toggleAccount, toggleActivity, toggleKey, updateAccount } from './pages/access';
import { clearArchives, getArchives, getWaiting, moveToArchives, removeArchive } from './pages/archives';

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
    const pending = await RedditPost.pending();
    res.render('index', {
        foo: new Date().toLocaleTimeString(),
        pending,
        accounts: await IGAccount.getDisplay(),
    });
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
app.post('/account/reload', authOwner, (req, res) => {
    IGAccount._.reload();
    res.redirect('/access');
});

app.get('/queries', auth, getQuery);
app.post('/query/add', auth, addQuery);
app.post('/query/:id/toggle', auth, toggleQuery);
app.post('/query/:id/remove', auth, removeQuery);

app.get('/archived', auth, getArchives);
app.post('/archived/clear', auth, clearArchives);
app.post('/archived/:id/manage', auth, removeArchive);

app.get('/waiting', auth, getWaiting);
app.post('/waiting/:id/archive', auth, moveToArchives);

app.post('/approve/:id', auth, approvePost);

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
