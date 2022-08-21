import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('Connect called');
prisma.$connect();

export default prisma;
export * from './accounts';
export * from './activity';
export * from './users';
export * from './fetch';
export * from './posts';
