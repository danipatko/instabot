import { LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { getUsers } from 'app/models/user.server';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import { getPending } from '~/models/post.server';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return json(await getPending());
}

export const meta: MetaFunction = () => ({
    title: 'Posts',
});

export default function Posts() {
    const data = useLoaderData<typeof loader>();

    return <div className="">showing uploaded posts</div>;
}
