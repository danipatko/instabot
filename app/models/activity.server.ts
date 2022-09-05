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

const getAccountList = async () => await prisma.account.findMany({ select: { id: true, username: true } });

const upsertAccount = async (username: string, password: string, activity_id: number, id: number) =>
    prisma.account
        .upsert({
            update: { username, password, activity_id: isNaN(activity_id) ? null : activity_id },
            create: { username, password, last_used: new Date(0), activity_id: isNaN(activity_id) ? null : activity_id },
            where: { ...(!isNaN(id) && { id }) },
        })
        .then(() => true)
        .catch(() => false);

const deleteAccount = async (id: number) =>
    prisma.account
        .delete({ where: { id } })
        .then(() => true)
        .catch(() => false);

const getActivities = () => prisma.activity.findMany({ include: { accounts: { select: { username: true } } } });

const upsertActivity = async (
    id: number,
    follow_target: number,
    unfollow_target: number,
    post_target: number,
    timespan: number,
    auto_upload: boolean
) => {
    if (isNaN(timespan) || isNaN(post_target) || isNaN(follow_target) || isNaN(unfollow_target)) return false;
    return await prisma.activity
        .upsert({
            create: {
                timespan,
                post_target,
                auto_upload,
                follow_target,
                unfollow_target,
            },
            update: {
                timespan,
                auto_upload,
                post_target,
                follow_target,
                unfollow_target,
            },
            where: { ...(!isNaN(id) && { id }) },
        })
        .then(() => true)
        .catch(() => false);
};

const deleteActivity = async (id: number) => await prisma.activity.delete({ where: { id } });

export { getAccounts, getAccountList, upsertAccount, deleteAccount, getActivities, upsertActivity, deleteActivity };
