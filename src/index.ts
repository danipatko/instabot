import { createRequestHandler } from '@remix-run/express';
import { createWriteStream } from 'fs';
import compression from 'compression';
import express from 'express';
import path from 'path/posix';
import morgan from 'morgan';

const app = express();

// middleware
app.use(compression());
app.disable('x-powered-by');
const accessLogStream = createWriteStream('access.log', { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

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

// entry
app.listen(3000, '0.0.0.0', () => console.log('Server listening on http://0.0.0.0:3000\n'));
