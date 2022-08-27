import type { LoaderArgs, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { getUsers } from 'app/models/user.server';

export async function loader({ request, params }: LoaderArgs) {
    return json(await getUsers());
}

export async function meta() {
    return {
        title: 'Access',
    };
}

export default function Access() {
    const data = useLoaderData<typeof loader>();

    return (
        <main className="p-4">
            <ul>
                {data.map((x, i) => (
                    <li key={i}>{x.username}</li>
                ))}
            </ul>
        </main>
    );
}
