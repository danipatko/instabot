import prisma from '.';

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

const createActivity = async (data: Activity) => await prisma.activity.create({ data: { ...data } });

const deleteActivity = async (id: number) => await prisma.activity.delete({ where: { id } });

const updateActivity = async (id: number, data: Partial<Activity>) =>
    await prisma.activity.update({ data: { ...data }, where: { id } });

export { createActivity, deleteActivity, updateActivity };
export type { Activity, BaseActivity };
