import type { Request, Response } from 'express';
import { signSessionToken } from '../auth';
import { randstr } from '../util';
import prisma from '.';

const createUser = async (username: string) => await prisma.user.create({ data: { username, token: randstr(20) } });

const deleteUser = async (id: number) => await prisma.user.delete({ select: { id: true }, where: { id } });

const loginUser = async (req: Request, res: Response) => {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        const { id } = await prisma.user.create({
            select: { id: true },
            data: { token: randstr(20), username: 'admin', is_admin: true },
        });
        signSessionToken({ admin: true, id }, res);
        return void res.redirect('/');
    }

    const { username, token } = req.body;
    if (!(username && token)) return void res.redirect('/login');

    const data = await prisma.user.findFirst({ select: { id: true, is_admin: true }, where: { username, token } });
    if (!data) return void res.redirect('/login');

    signSessionToken({ admin: data.is_admin, id: data.id }, res);
    res.redirect('/');
};

export { createUser, deleteUser, loginUser };
