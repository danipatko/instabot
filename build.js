const esbuild = require('esbuild');
(async () => {
    const start = Date.now();

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

    console.log(`Done in ${Date.now() - start}ms\n`);
})();
