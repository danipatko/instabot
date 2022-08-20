import prisma from '.';

const getUnchecked = async () =>
    prisma.source.findMany({ include: { video: true }, where: { archived: false }, orderBy: { ups: 'desc' } });

const getArchive = async () =>
    prisma.source.findMany({ include: { video: true }, where: { archived: true }, orderBy: { ups: 'desc' } });

const getPending = async () =>
    prisma.post.findMany({
        include: { source: { include: { video: true } } },
        where: { uploaded: false },
        orderBy: { upload_index: 'asc' },
    });

const getUploaded = async () =>
    prisma.post.findMany({
        include: { source: { include: { video: true } } },
        where: { uploaded: true },
        orderBy: { created_at: 'desc' },
    });

const acceptPost = async (id: number) => {
    prisma.post.create({ data: { caption: '', upload_index: 0 } });
};

export { getArchive, getPending, getUnchecked, getUploaded };
