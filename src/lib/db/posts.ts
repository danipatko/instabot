import prisma from '.';
import fs from 'fs';
import { promisify } from 'util';

const rm = promisify(fs.rm);

const getUnchecked = async () => prisma.source.findMany({ where: { archived: false }, orderBy: { ups: 'desc' } });

const getArchive = async () =>
    prisma.source.findMany({
        include: { post: true },
        where: { archived: true },
        orderBy: { ups: 'desc' },
    });

const getPending = async () =>
    prisma.post.findMany({
        include: { source: true },
        where: { uploaded: false },
        orderBy: { upload_index: 'asc' },
    });

const getUploaded = async () =>
    prisma.post.findMany({
        include: { source: true },
        where: { uploaded: true },
        orderBy: { created_at: 'desc' },
    });

const defaultCaption = (title: string, author: string, url: string) => `${title}\nCredit to ${author}\n${url}`;

const acceptPost = async (id: number, account_id: number) => {
    const source = await prisma.source.findFirst({ select: { title: true, author: true, url: true }, where: { id } });
    if (!source) return { post: null };

    const count = await prisma.post.count({ where: { uploaded: false } });
    return prisma.source.update({
        select: { post: true },
        data: {
            archived: true,
            post: {
                create: {
                    caption: defaultCaption(source.title, source.author, source.url),
                    account_id,
                    upload_index: count,
                },
            },
        },
        where: { id },
    });
};

const archivePost = async (id: number) => prisma.source.update({ select: { id: true }, data: { archived: true }, where: { id } });

const deletePost = async (id: number): Promise<boolean> => {
    return prisma.source
        .delete({ where: { id } })
        .then(({ file }) => rm(file))
        .then(() => true)
        .catch((e) => {
            console.error(`Failed to delete post ${id}.\n${e}`);
            return false;
        });
};

export { getArchive, getPending, getUnchecked, getUploaded, acceptPost, archivePost, deletePost };
