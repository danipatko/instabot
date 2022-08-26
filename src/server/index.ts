import { createRequestHandler } from '@remix-run/express';
import ActivityCycle from '../lib/instagram/activity';
import { fetchPosts } from '../lib/reddit/fetch';
import Queue from '../lib/reddit/queue';
import compression from 'compression';
import prisma from '../lib/db';
import express from 'express';
import router from './routes';
import logger from 'morgan';
import path from 'path/posix';

const app = express();

// middleware
app.use(compression());
app.use(logger('dev'));
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// static
app.use('/content', express.static('./content/'));
app.use('/build', express.static('public/build', { immutable: true, maxAge: '1y' }));
app.use(express.static('public', { maxAge: '1h' }));

// remix
const BUILD_DIR = path.join(process.cwd(), 'build');

app.all(
    '*',
    process.env.NODE_ENV === 'development'
        ? (req, res, next) => {
              purgeRequireCache();

              return createRequestHandler({
                  build: require(BUILD_DIR),
                  mode: process.env.NODE_ENV,
              })(req, res, next);
          }
        : createRequestHandler({
              build: require(BUILD_DIR),
              mode: process.env.NODE_ENV,
          })
);

function purgeRequireCache() {
    for (const key in require.cache) {
        if (key.startsWith(BUILD_DIR)) {
            delete require.cache[key];
        }
    }
}

// misc
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

// routes
app.use('/api', router);

// entry
app.listen(3000, '0.0.0.0', () => console.log('Server listening on http://0.0.0.0:3000\n'));
