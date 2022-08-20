import prisma from '.';

const createAccount = async (username: string, password: string) => await prisma.account.create({ data: { username, password } });

const deleteAccount = async (id: number) => await prisma.account.delete({ select: { id: true }, where: { id } });

const linkActivity = async (id: number, activity_id: number) =>
    await prisma.account.update({ data: { activity_id }, where: { id } });

const unlinkActivity = async (id: number) => await prisma.account.update({ data: { activity_id: null }, where: { id } });

export { createAccount, deleteAccount, linkActivity, unlinkActivity };
