import { defaultCaption } from '~/lib/util.server';
import prisma from '~/lib/db.server';
import { promisify } from 'util';
import path from 'path/posix';
import fs from 'fs';

const rm = promisify(fs.rm);

const getArchive = async () =>
    prisma.source.findMany({
        include: { post: true },
        where: { archived: true },
        orderBy: { ups: 'desc' },
    });

const getPending = async () =>
    prisma.source.findMany({
        where: { post: null, archived: false },
        orderBy: { ups: 'desc' },
    });

const getUploaded = async () =>
    prisma.post.findMany({
        include: { source: true },
        orderBy: { created_at: 'desc' },
    });

const acceptPost = async (id: number, account_id: number): Promise<boolean> => {
    const source = await prisma.source.findFirst({ select: { title: true, author: true, url: true }, where: { id } });
    if (!source) return false;

    return prisma.source
        .update({
            select: { post: true },
            data: {
                archived: true,
                post: {
                    create: {
                        caption: defaultCaption(source.title, source.author, source.url),
                        account_id,
                    },
                },
            },
            where: { id },
        })
        .then(() => true)
        .catch(() => false);
};

const changePostCaption = async (id: number, caption: string) => {
    return prisma.post
        .update({ data: { caption }, where: { id } })
        .then(() => true)
        .catch(() => false);
};

const archivePost = async (id: number) =>
    prisma.source
        .update({ select: { id: true }, data: { archived: true }, where: { id } })
        .then(() => true)
        .catch(() => false);

const deletePost = async (id: number): Promise<boolean> =>
    prisma.source
        .delete({ where: { id } })
        .then(({ file }) => rm(path.join('content', file)))
        .then(() => true)
        .catch((e) => {
            console.error(`Failed to delete post ${id}.\n${e}`);
            return false;
        });

const getFetch = async () => prisma.fetch.findMany({ include: { account: { select: { id: true } } } });

const upsertFetch = async (
    id: number | undefined,
    enabled: boolean,
    limit: number,
    over_18: boolean,
    page_reset: number,
    sort: string,
    sub: string,
    time: string,
    timespan: number,
    type: string,
    q: string,
    account_id: number | null
) => {
    return prisma.fetch
        .upsert({
            create: {
                q,
                sub,
                time,
                sort,
                type,
                limit,
                over_18,
                enabled,
                timespan,
                page_after: '',
                page_count: 0,
                page_reset,
                account_id,
            },
            update: {
                q,
                sub,
                time,
                sort,
                type,
                limit,
                over_18,
                enabled,
                timespan,
                page_reset,
                account_id,
            },
            where: { id },
        })
        .then(() => true)
        .catch(() => false);
};

const deleteFetch = async (id: number) => {
    return prisma.fetch
        .delete({ where: { id } })
        .then(() => true)
        .catch(() => false);
};

export {
    getPending,
    getArchive,
    getUploaded,
    acceptPost,
    archivePost,
    getFetch,
    upsertFetch,
    deleteFetch,
    changePostCaption,
    deletePost,
};
