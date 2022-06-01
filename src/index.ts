import express from 'express';
import { test } from './lib/tables';
// database tests
test();

const port = 3000;
const host = 'localhost';
const app = express();

app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

app.use((req, res, next) => {
    // log requests
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

    next();
});

app.get('/', (req, res) => {
    res.render('index', { foo: new Date().toLocaleTimeString() });
});

app.post('/login', (req, res) => {
    const { token } = req.body;
    if (!token) return void res.status(400).send('missing token');
});

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
