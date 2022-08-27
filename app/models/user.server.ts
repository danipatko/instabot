import { TokenData } from '~/session.server';
import { randstr } from 'src/lib/util';
import prisma from '../../src/lib/db';
import { User } from '@prisma/client';

const getUsers = async () => {
    return await prisma.user.findMany();
};

const getUserByToken = async (token: string): Promise<TokenData | null> => {
    return await prisma.user.findFirst({ select: { id: true, is_admin: true }, where: { token } });
};

const addUser = async (username: string, is_admin: boolean) => {
    return await prisma.user.create({ data: { username, token: randstr(10), is_admin } });
};

const removeUser = async (id: number) => {
    return await prisma.user.delete({ where: { id } });
};

const updateUser = async (id: number, username: string, is_admin: boolean): Promise<boolean> => {
    if (id === 1 && !is_admin) return false;
    return prisma.user
        .update({ data: { username, is_admin }, where: { id } })
        .then(() => true)
        .catch(() => false);
};

export { getUsers, getUserByToken, addUser, removeUser, updateUser };
