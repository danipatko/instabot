import { Form, useActionData, useLoaderData, useTransition } from '@remix-run/react';
import { ActionArgs, LoaderArgs, redirect } from '@remix-run/node';
import { deleteActivity, getActivities, upsertActivity } from '~/models/activity.server';
import type { Activity as Act } from '@prisma/client';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import { useState } from 'react';
import Switch from '~/components/Switch';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return json(await getActivities());
}

export async function action({ request }: ActionArgs) {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const { id, timespan, post_target, follow_target, unfollow_target, auto_upload, remove } = Object.fromEntries(fd);

    if (remove) {
        const accId = Number(id.toString());
        const ok = !isNaN(accId) && (await deleteActivity(accId));
        return json({ message: ok ? '' : `Failed to remove account ${accId}.` });
    }

    if (!(timespan && follow_target && unfollow_target && post_target))
        return json({ message: `Failed to update activity: bad request.` });

    const ok = await upsertActivity(
        Number(id),
        Number(follow_target),
        Number(unfollow_target),
        Number(post_target),
        Number(timespan),
        auto_upload !== undefined
    );
    return json({ message: ok ? '' : `Failed to update account.` });
}

type ActivityProps = Act & {
    accounts: {
        username: string;
    }[];
};

const Activity = (props: ActivityProps) => {
    const transition = useTransition();

    return (
        <div className="relative max-w-xl w-full mb-3 py-2 px-3 md:px-5 border border-gray-300 shadow-md rounded-lg">
            {transition.state === 'submitting' && (
                <div className="absolute w-full h-full z-10 bg-white opacity-50 flex justify-center items-center">
                    <div>Saving...</div>
                </div>
            )}
            <Form reloadDocument={true} className="space-y-4" method="post">
                <div className="px-8 space-y-4">
                    <input type="text" className="hidden" name="id" value={props.id} readOnly={true} />
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Timespan</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="timespan"
                                name="timespan"
                                type="number"
                                autoComplete="timespan"
                                defaultValue={props.timespan}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Post target</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="post_target"
                                name="post_target"
                                type="number"
                                autoComplete="post_target"
                                defaultValue={props.post_target}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Follow target</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="follow_target"
                                name="follow_target"
                                type="number"
                                autoComplete="follow_target"
                                defaultValue={props.follow_target}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Unollow target</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="unfollow_target"
                                name="unfollow_target"
                                type="number"
                                autoComplete="unfollow_target"
                                defaultValue={props.follow_target}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Auto upload</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <Switch name="auto_upload" value={props.auto_upload}></Switch>
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Used by</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            {props.accounts.map(({ username }) => username).join(', ')}
                        </dd>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        name="remove"
                        value="1"
                        type="submit"
                        className="text-sm block px-5 py-2 rounded-md hover:bg-gray-100 text-[0.8125rem] font-semibold leading-5 text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Remove
                    </button>
                    <button
                        name="save"
                        value="1"
                        type="submit"
                        className="text-sm block px-5 py-2 rounded-md hover:bg-gray-100 text-[0.8125rem] font-semibold leading-5 text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Save
                    </button>
                </div>
            </Form>
        </div>
    );
};

export default function Whatever() {
    const data = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [activities, setActivities] = useState<ActivityProps[]>(data.map((x) => ({ ...x, last_used: new Date(x.last_used) })));

    const addNewActivity = () => {
        setActivities((x) => [
            ...x,
            {
                id: 0,
                timespan: 1,
                accounts: [],
                last_used: new Date(0),
                post_target: 0,
                auto_upload: false,
                follow_queue: '',
                follow_target: 0,
                unfollow_queue: '',
                unfollow_target: 0,
            },
        ]);
    };

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">
                {actionData?.message && (
                    <div className="w-full p-3 text-center text-xs font-semibold text-white bg-red-600">{actionData.message}</div>
                )}
                {activities.length ? (
                    activities.map((x, i) => <Activity key={i} {...x} />)
                ) : (
                    <p className="py-12 text-center">There are no activities.</p>
                )}
                <div className="mt-4 w-full inline-flex justify-center items-center">
                    <button
                        className="text-sm block px-5 py-2 rounded-md hover:bg-gray-100 text-[0.8125rem] font-semibold leading-5 text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={addNewActivity}>
                        Add new
                    </button>
                </div>
            </div>
        </div>
    );
}
