import { LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { getUsers } from 'app/models/user.server';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import { getPending } from '~/models/post.server';
import Post from '~/components/Post';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return null;
}

export default function Activity() {
    // const data = useLoaderData<typeof loader>();

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">Editing activities</div>
        </div>
    );
}
