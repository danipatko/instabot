import { ActionArgs, LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { acceptPost, archivePost, getPending } from '~/models/post.server';
import { Form, useLoaderData } from '@remix-run/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import Post from '~/components/Post';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return json(await getPending());
}

export async function action({ request }: ActionArgs) {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const { id, action } = Object.fromEntries(fd);
    if (!(id && action)) return json({ message: `Failed to do action: bad request.` });

    console.log(action);
    if (action.toString() === 'accept') {
        await acceptPost(Number(id.toString()), 0);
    } else {
        //
        await archivePost(Number(id.toString()));
    }

    const ok = true;
    return json({ message: ok ? '' : `Failed to update account.` });
}

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
                                <Form reloadDocument method="post">
                                    <input type="number" className="hidden" readOnly value={x.id} />
                                    <div className="flex justify-end items-center">
                                        <div className="flex-1">
                                            <a
                                                target="_blank"
                                                className="text-sm px-4 py-2 rounded-md hover:bg-gray-100 font-semibold"
                                                href={x.url}>
                                                Open original
                                            </a>
                                        </div>
                                        <button
                                            name="action"
                                            value="accept"
                                            className="text-sm block px-4 py-2 rounded-md hover:bg-gray-100 font-semibold">
                                            Upload
                                        </button>
                                        <button
                                            name="action"
                                            value="archive"
                                            className="text-sm block px-4 py-2 rounded-md hover:bg-gray-100 font-semibold">
                                            Archive
                                        </button>
                                    </div>
                                </Form>
                            </Post>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
