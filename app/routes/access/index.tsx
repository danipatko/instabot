import { ActionArgs, LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useTransition } from '@remix-run/react';
import { getUsers, updateUser } from 'app/models/user.server';
import { getToken } from '~/session.server';
import Switch from '~/components/Switch';
import { json } from '@remix-run/node';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    if (!token.is_admin) throw new Response('Forbidden', { status: 403 });

    return json(await getUsers());
}

export async function action({ request }: ActionArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');

    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const username = fd.get('username');
    const id = fd.get('id');
    if (!(username && id)) return json({ message: `Failed to update user: missing username or id.` });
    const is_admin = fd.get('is_admin');

    const ok = await updateUser(Number(id), username.toString(), is_admin === 'on');
    return json({ message: ok ? '' : `Failed to update '${username}'.` });
}

export const meta: MetaFunction = () => ({
    title: 'Manage access',
});

export default function Access() {
    const data = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const transition = useTransition();

    return (
        <>
            {actionData?.message && (
                <div className="w-full p-3 text-center text-xs font-semibold text-white bg-red-600">{actionData.message}</div>
            )}
            <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
                {data.map((x, i) => (
                    <div key={i} className="max-w-xl w-full my-4 p-5 md:px-5 border border-gray-300 shadow-md rounded-lg">
                        <Form className="space-y-4" method="post">
                            <input type="text" className="hidden" name="id" value={x.id} readOnly={true} />
                            <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Username</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        autoComplete="username"
                                        defaultValue={x.username}
                                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    />
                                </dd>
                            </div>
                            <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Admin</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <Switch name="is_admin" value={x.is_admin}></Switch>
                                </dd>
                            </div>
                            <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Token</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{x.token}</dd>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    {transition.state === 'submitting' ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </Form>
                    </div>
                ))}
            </div>
        </>
    );
}
