import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import QueryBuilder from './lib/db/builder';
import { escape, randStr } from './lib/util';
import { accessKeys, AccessKeyTable, test } from './lib/tables';
// database tests
test();

// fs options
const SAVE_DIR = 'public';

dotenv.config();
const PRIVATE_TOKEN = process.env.PRIVATE_TOKEN ?? randStr(30);

const port = 3000;
const host = 'localhost';
const app = express();

app.set('view engine', 'ejs');
app.use('/static', express.static('public'));
app.use(bodyParser.json());
app.use(cookieParser(PRIVATE_TOKEN));

// authorization middleware
app.use((req, res, next) => {
    // log requests
    console.log(
        `[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`
    );
    if (req.url === '/login' || req.url.startsWith('/static'))
        return void next();

    // authorize
    const { token } = req.cookies;
    if (!token) return void res.status(403).send('unauthorized');

    const id = jwt.verify(token, PRIVATE_TOKEN);
    if (!id) return void res.status(403).send('unauthorized');

    next();
});

app.get('/', (req, res) => {
    res.render('index', { foo: new Date().toLocaleTimeString() });
});

app.post('/login', async (req, res) => {
    const { token } = req.body;
    if (!token) return void res.status(400).send('missing token');

    const key = await accessKeys.fetch(escape(token));
    if (!key || key.valid !== 1)
        return void res.status(403).send('invalid token');

    const signed = jwt.sign({ token }, PRIVATE_TOKEN, {
        expiresIn: 86_400,
    });

    res.cookie('token', signed, { maxAge: 86_400, sameSite: 'strict' });
    res.render('index', { foo: 'bar' });
});

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
