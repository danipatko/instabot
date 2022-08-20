/// <reference types="astro/client" />
interface ImportMetaEnv {
    readonly SECRET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
