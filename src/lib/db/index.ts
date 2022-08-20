import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('Connect called');
prisma.$connect();

export default prisma;
