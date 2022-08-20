import express from 'express';

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

app.listen(3000, '0.0.0.0', () => console.log('Server listening on http://0.0.0.0:3000\n'));
