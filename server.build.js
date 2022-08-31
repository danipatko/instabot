// NOTE: for whatever reason, a build.js file in the project dir will cause remix to crash.

const esbuild = require('esbuild');
(async () => {
    console.time('Build time');

    await esbuild.build({
        target: 'esnext',
        outdir: 'dist',
        // add installed packages here
        external: [
            'morgan',
            'express',
            'bluebird',
            'esbuild',
            'node-fetch',
            'compression',
            'jsonwebtoken',
            'fluent-ffmpeg',
            'cookie-parser',
            '@prisma/client',
            '@remix-run/node',
            '@remix-run/express',
            'instagram-private-api',
        ],
        format: 'iife',
        bundle: true,
        platform: 'node',
        tsconfig: 'tsconfig.server.json',
        entryPoints: ['./src/server/index.ts'],
    });

    console.timeEnd('Build time');
})();
