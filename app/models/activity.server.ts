import prisma from 'src/lib/db';

interface BaseActivity {
    id: number;
    timespan: number; // in minutes
    post_target: number;
    follow_target: number;
    unfollow_target: number;
}

interface Activity extends BaseActivity {
    auto_upload: boolean;
    follow_queue: string;
    unfollow_queue: string;
}

const getAccounts = async () => ({
    accounts: await prisma.account.findMany(),
    activities: await prisma.activity.findMany({ select: { id: true } }),
});

const upsertAccount = async (username: string, password: string, activity_id: number, id: number) =>
    prisma.account
        .upsert({
            update: { username, password, ...(!isNaN(activity_id) && { activity_id }) },
            create: { username, password, ...(!isNaN(activity_id) && { activity_id }) },
            where: { ...(!isNaN(id) && { id }) },
        })
        .then(() => true)
        .catch(() => false);

const deleteAccount = async (id: number) =>
    prisma.account
        .delete({ where: { id } })
        .then(() => true)
        .catch(() => false);

const createActivity = async (data: Activity) => await prisma.activity.create({ data: { ...data } });

const deleteActivity = async (id: number) => await prisma.activity.delete({ where: { id } });

const updateActivity = async (id: number, data: Partial<Activity>) =>
    await prisma.activity.update({ data: { ...data }, where: { id } });

export { getAccounts, upsertAccount, deleteAccount, createActivity, deleteActivity, updateActivity };
