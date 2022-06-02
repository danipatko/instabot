import dotenv from 'dotenv';
import { test } from './lib/tables';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { getLogin, postLogin, auth } from './pages/login';
import express, { NextFunction, Request, Response } from 'express';
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
app.use('/static', express.static('public'));
app.set('view engine', 'ejs');

app.get('/', auth, (req, res) => {
    res.render('index', { foo: new Date().toLocaleTimeString() });
});

app.get('/login', getLogin);
app.post('/login', postLogin);

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
