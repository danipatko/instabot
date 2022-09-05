import { Form, useActionData, useLoaderData, useTransition } from '@remix-run/react';
import { deleteFetch, getFetch, upsertFetch } from '~/models/post.server';
import { ActionArgs, LoaderArgs, redirect } from '@remix-run/node';
import { getAccountList } from '~/models/activity.server';
import { QueueItem } from 'src/lib/reddit/queue';
import type { Fetch } from '@prisma/client';
import { getToken } from '~/session.server';
import Switch from '~/components/Switch';
import { queue } from '~/runtime.server';
import { normalizeHours } from '~/util';
import { json } from '@remix-run/node';
import { useState } from 'react';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');

    return json({ fetch: await getFetch(), queue: queue.state, accounts: await getAccountList() });
}

export async function action({ request }: ActionArgs) {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const { id, sub, enabled, type, q, sort, time, limit, page_reset, over_18, timespan, account_id, remove } =
        Object.fromEntries(fd);

    if (remove) {
        const accId = Number(id.toString());

        let ok = true;
        if (!isNaN(accId)) {
            ok = await deleteFetch(accId);
            queue.disable(accId);
        } else ok = false;

        return json({ message: ok ? '' : `Failed to remove query ${accId}.` });
    }

    if (
        !(
            sub &&
            type &&
            sort &&
            time &&
            q !== undefined &&
            limit !== undefined &&
            page_reset !== undefined &&
            account_id !== undefined
        )
    )
        return json({ message: `Failed to update activity: bad request.` });

    const ok = await upsertFetch(
        Number(id),
        enabled === 'on',
        Number(limit),
        over_18 === 'on',
        Number(page_reset.toString()),
        sort.toString(),
        sub.toString(),
        time.toString(),
        Number(timespan.toString()),
        type.toString(),
        q.toString(),
        account_id.toString() == '0' ? null : Number(account_id.toString())
    );

    if (ok) {
        if (enabled === 'on') queue.enable(Number(id));
        else queue.disable(Number(id));
    }

    return json({ message: ok ? '' : `Failed to update query.` });
}

type FetchItem = Fetch & {
    account: {
        id: number;
    } | null;
};

type Accounts = {
    accounts: {
        id: number;
        username: string;
    }[];
};

type QueueProps = {
    fetch: FetchItem[];
    queue: QueueItem[];
    accounts: { id: number; username: string }[];
};

const FetchListItem = ({ accounts, ...props }: FetchItem & Accounts) => {
    const transition = useTransition();

    return (
        <div className="relative max-w-xl w-full mb-3 py-2 px-3 md:px-5 border border-gray-300 shadow-md rounded-lg">
            {transition.state === 'submitting' && (
                <div className="absolute w-full h-full z-10 bg-white opacity-50 flex justify-center items-center">
                    <div>Saving...</div>
                </div>
            )}
            <Form reloadDocument className="space-y-4" method="post">
                <div className="px-8 space-y-4">
                    <input type="text" className="hidden" name="id" value={props.id} readOnly={true} />
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Subreddit</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="sub"
                                name="sub"
                                type="text"
                                autoComplete="sub"
                                defaultValue={props.sub}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Enabled</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <Switch name="enabled" value={props.enabled}></Switch>
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Timespan (hours)</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="timespan"
                                name="timespan"
                                type="number"
                                step={0.001}
                                autoComplete="timespan"
                                defaultValue={props.timespan}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Type</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <select name="type" defaultValue={props.type}>
                                <option value="search">Search</option>
                                <option value="hot">Hot</option>
                                <option value="best">Best</option>
                                <option value="rising">Rising</option>
                                <option value="new">New</option>
                            </select>
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Time of upload</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <select name="time" defaultValue={props.time}>
                                <option value="hour">Hour</option>
                                <option value="day">Day</option>
                                <option value="month">Month</option>
                                <option value="year">This year</option>
                                <option value="all">All time</option>
                            </select>
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Number of posts</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="limit"
                                name="limit"
                                type="number"
                                autoComplete="limit"
                                defaultValue={props.limit}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Reset paging after</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="page_reset"
                                name="page_reset"
                                type="number"
                                autoComplete="page_reset"
                                defaultValue={props.page_reset}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">NSFW content</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <Switch name="over_18" value={props.over_18}></Switch>
                        </dd>
                    </div>

                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Search phrase</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <input
                                id="q"
                                name="q"
                                type="text"
                                autoComplete="q"
                                defaultValue={props.q ?? ''}
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            />
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">
                            Sort search results by:
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <select name="sort" defaultValue={props.sort}>
                                <option value="hot">Hot</option>
                                <option value="best">Best</option>
                                <option value="rising">Rising</option>
                                <option value="new">New</option>
                            </select>
                        </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Upload from</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <select name="account_id" defaultValue={props.account_id ?? 0}>
                                <option value={0}>None</option>
                                {accounts.map((x, i) => (
                                    <option key={i} value={x.id}>
                                        {x.username}
                                    </option>
                                ))}
                            </select>
                        </dd>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button name="remove" value="1" type="submit" className="button">
                        Remove
                    </button>
                    <button name="save" value="1" type="submit" className="button">
                        Save
                    </button>
                </div>
            </Form>
        </div>
    );
};

export default function Queue() {
    const data = useLoaderData<QueueProps>();
    const actionData = useActionData<typeof action>();
    const [fetchItems, setFetchItems] = useState<FetchItem[]>(data.fetch);

    const addNewFetchItem = () => {
        setFetchItems((x) => [
            ...x,
            {
                q: '',
                id: 0,
                sub: '',
                sort: '',
                time: 'day',
                type: 'hot',
                limit: 3,
                enabled: false,
                over_18: false,
                timespan: 4,
                page_count: 0,
                page_reset: 20,
                page_after: '',
                account_id: null,
                account: null,
            },
        ]);
    };

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">
                {actionData?.message && (
                    <div className="w-full p-3 text-center text-xs font-semibold text-white bg-red-600">{actionData.message}</div>
                )}
                <ul className="mb-4 space-y-4 text-center">
                    {data.queue.map((x, i) => (
                        <li key={i} className="text-sm text-gray-500">
                            <span className="text-orange-600 font-semibold">{x.name}</span> in{' '}
                            <span className="font-semibold">
                                {normalizeHours((new Date(x.time).getTime() - Date.now()) / (60 * 60 * 1000))}
                            </span>
                        </li>
                    ))}
                </ul>

                {fetchItems.length ? (
                    fetchItems.map((x, i) => <FetchListItem key={i} {...{ ...x, accounts: data.accounts }} />)
                ) : (
                    <p className="py-12 text-center">There are no activities.</p>
                )}
                <div className="mt-4 w-full inline-flex justify-center items-center">
                    <button className="button" onClick={addNewFetchItem}>
                        Add new
                    </button>
                </div>
            </div>
        </div>
    );
}
