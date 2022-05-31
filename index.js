require("esbuild")
    .build({
        outdir: "./dist",
        bundle: true,
        target: "esnext",
        platform: "node",
        tsconfig: "tsconfig.json",
    })
    .catch((e) => console.error(e))
    .finally(() => console.log("done"));
