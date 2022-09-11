import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

declare global {
    var __db__: PrismaClient;
}

// prevent creating multiple instances of prisma client in dev mode
if (process.env.NODE_ENV === 'production') {
    prisma = getClient();
} else {
    if (!global.__db__) {
        global.__db__ = getClient();
    }
    prisma = global.__db__;
}

function getClient() {
    const client = new PrismaClient();
    client.$connect();

    return client;
}

export default prisma;
