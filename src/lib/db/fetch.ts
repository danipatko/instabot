import type { Fetch } from '@prisma/client';
import prisma from '.';

const getFetch = async () =>
    await prisma.fetch.findMany({ include: { _count: { select: { activities: true } } }, orderBy: { sub: 'asc' } });

const createFetch = async (data: Fetch) => await prisma.fetch.create({ data: { ...data } });

const deleteFetch = async (id: number) => await prisma.fetch.delete({ where: { id } });

const updateFetch = async (id: number, data: Partial<Fetch>) => await prisma.fetch.update({ data: { ...data }, where: { id } });

export { getFetch, createFetch, updateFetch, deleteFetch };
