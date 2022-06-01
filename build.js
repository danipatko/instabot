const start = Date.now();
require('esbuild')
    .build({
        outfile: './dist/bundle.js',
        bundle: true,
        target: 'esnext',
        platform: 'node',
        tsconfig: 'tsconfig.json',
        entryPoints: ['./src/index.ts'],
    })
    .catch((e) => console.error(e))
    .finally(() => console.log(`Done in ${Date.now() - start}ms\n`));
