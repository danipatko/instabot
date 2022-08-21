const esbuild = require('esbuild');
(async () => {
    console.time('Build time');

    await esbuild.build({
        target: 'esnext',
        outdir: 'dist',
        // add installed packages here
        external: [
            'express',
            'bluebird',
            'jsonwebtoken',
            'fluent-ffmpeg',
            'cookie-parser',
            '@prisma/client',
            './dist/server/entry.mjs',
        ],
        bundle: true,
        platform: 'node',
        tsconfig: 'tsconfig.json',
        entryPoints: ['./src/server/index.ts'],
    });

    console.timeEnd('Build time');
})();
