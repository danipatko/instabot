import { LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import { useState } from 'react';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');

    return json({ url: request.url.split('/').pop() });
}

export default function Posts() {
    const { url: firstUrl } = useLoaderData<typeof loader>();
    const [url, setUrl] = useState<string>(firstUrl ?? 'posts');

    return (
        <>
            <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
                <div className="pointer-events-auto flex divide-x divide-slate-400/20 overflow-hidden rounded-md bg-white text-[0.8125rem] font-medium leading-5 text-slate-700 shadow-sm ring-1 ring-slate-700/10">
                    {[
                        { to: '/posts', url: 'posts', name: 'Pending' },
                        { to: '/posts/archives', url: 'archives', name: 'Archives' },
                        { to: '/posts/uploads', url: 'uploads', name: 'Uploads' },
                        { to: '/posts/queue', url: 'queue', name: 'Queue' },
                    ].map((x, i) => (
                        <Link onClick={() => setUrl(x.url)} key={i} to={x.to}>
                            <div
                                className={`cursor-pointer py-2 px-4 ${
                                    x.url == url ? 'bg-slate-200' : 'hover:bg-slate-50'
                                } hover:text-slate-900`}>
                                {x.name}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <Outlet />
        </>
    );
}
