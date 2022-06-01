const start = Date.now();
require('esbuild')
    .build({
        bundle: true,
        target: 'esnext',
        outfile: './dist/bundle.js',
        platform: 'node',
        tsconfig: 'tsconfig.json',
        entryPoints: ['./src/index.ts'],
    })
    .catch((e) => console.error(e))
    .finally(() => console.log(`Done in ${Date.now() - start}ms\n`));
