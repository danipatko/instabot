import { ActionArgs, LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useTransition } from '@remix-run/react';
import { getUsers, updateUser } from 'app/models/user.server';
import { getToken } from '~/session.server';
import Switch from '~/components/Switch';
import { json } from '@remix-run/node';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');

    return json(await getUsers());
}

export const meta: MetaFunction = () => ({
    title: 'Posts',
});

export default function Posts() {
    const data = useLoaderData<typeof loader>();

    return <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8"></div>;
}
