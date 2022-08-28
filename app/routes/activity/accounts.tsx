import { Form, useActionData, useLoaderData, useTransition } from '@remix-run/react';
import type { Transition } from '@remix-run/react/dist/transition';
import { ActionArgs, LoaderArgs, redirect, TypedResponse } from '@remix-run/node';
import { deleteAccount, getAccounts, upsertAccount } from '~/models/activity.server';
import type { Account as Acc } from '@prisma/client';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import { useEffect, useState } from 'react';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return json(await getAccounts());
}

export async function action({ request }: ActionArgs) {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const { id, username, password, activity_id, remove } = Object.fromEntries(fd);

    if (remove) {
        const accId = Number(id.toString());
        const ok = !isNaN(accId) && (await deleteAccount(accId));
        return json({ message: ok ? '' : `Failed to remove account ${accId}.` });
    }

    if (!(username && password)) return json({ message: `Failed to update account: bad request.` });
    const ok = await upsertAccount(username.toString(), password.toString(), Number(activity_id), Number(id));
    return json({ message: ok ? '' : `Failed to update account.` });
}

interface AccountProps {
    props: Acc;
}

const Account = ({ props }: AccountProps) => {
    const transition = useTransition();

    return (
        <div className="max-w-xl w-full my-4 p-5 md:px-5 border border-gray-300 shadow-md rounded-lg">
            <Form reloadDocument={true} className="space-y-4" method="post">
                <input type="text" className="hidden" name="id" value={props.id} readOnly={true} />
                <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Username</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            defaultValue={props.username}
                            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        />
                    </dd>
                </div>
                <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Password</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="password"
                            defaultValue={props.password}
                            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        />
                    </dd>
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
                        {transition.state === 'submitting' ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </Form>
        </div>
    );
};

export default function Accounts() {
    const data = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [accounts, setAccounts] = useState<Acc[]>(data.accounts);

    const addNewAccount = () => {
        setAccounts((x) => [...x, { username: '', activity_id: 0, password: '', id: 0 }]);
    };

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">
                {actionData?.message && (
                    <div className="w-full p-3 text-center text-xs font-semibold text-white bg-red-600">{actionData.message}</div>
                )}
                {accounts.length ? (
                    accounts.map((x, i) => <Account key={i} props={x} />)
                ) : (
                    <p className="py-12 text-center">It seems like there are no instagram accounts to upload from.</p>
                )}
                <div className="mt-4 w-full inline-flex justify-center items-center">
                    <button
                        className="text-sm block px-5 py-2 rounded-md hover:bg-gray-100 text-[0.8125rem] font-semibold leading-5 text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={addNewAccount}>
                        Add new
                    </button>
                </div>
            </div>
        </div>
    );
}
