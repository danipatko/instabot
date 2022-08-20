import prisma from '.';
import { randstr } from '../util';

const createUser = async (username: string) => {
    prisma.user.create({ data: { username, token: randstr(20) } });
};

export default 0;
