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
    return json(await getPending());
}

export async function action() {
    //
}

export const meta: MetaFunction = () => ({
    title: 'Posts',
});

export default function Posts() {
    const data = useLoaderData<typeof loader>();

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">
                <ul>
                    {data.map((x, i) => {
                        return (
                            <Post key={i} src={x}>
                                {/* @ts-ignore */}
                                <div className="flex justify-end items-center">
                                    <div className="flex-1">
                                        <a
                                            target="_blank"
                                            className="text-sm px-4 py-2 rounded-md hover:bg-gray-100 font-semibold"
                                            href={x.url}>
                                            Open original
                                        </a>
                                    </div>
                                    <button className="text-sm block px-4 py-2 rounded-md hover:bg-gray-100 font-semibold">
                                        Upload
                                    </button>
                                    <button className="text-sm block px-4 py-2 rounded-md hover:bg-gray-100 font-semibold">
                                        Archive
                                    </button>
                                </div>
                            </Post>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
