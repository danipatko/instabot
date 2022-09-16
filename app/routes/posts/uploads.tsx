import { archivePost, changePostCaption, deletePost, getUploaded } from '~/models/post.server';
import { ActionArgs, LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { getAccountList } from '~/models/activity.server';
import { Form, useLoaderData } from '@remix-run/react';
import { Menu, Transition } from '@headlessui/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import Post from '~/components/Post';
import { Fragment } from 'react';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return json({ posts: await getUploaded(), accounts: await getAccountList() });
}

export const meta: MetaFunction = () => ({
    title: 'Uploaded posts',
});

export async function action({ request }: ActionArgs) {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const { id, action, caption } = Object.fromEntries(fd);
    if (!(id && action)) return json({ message: `Failed to do action: bad request.` });

    const _id = Number(id);
    if (isNaN(_id)) return json({ message: `Failed to do action: malformed id.` });

    let ok = false;
    switch (action.toString()) {
        case 'delete':
            ok = await deletePost(_id);
            break;
        case 'save':
            if (caption) ok = await changePostCaption(_id, caption.toString());
        default:
            ok = await archivePost(_id, true);
            break;
    }

    return json({ message: ok ? '' : `Failed to update database.` });
}

export default function Posts() {
    const data = useLoaderData<typeof loader>();

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">
                <ul>
                    {data.posts.map((x, i) => {
                        return (
                            <Post key={i} src={x.source} inline={false}>
                                {/* @ts-ignore */}
                                <Form reloadDocument method="post">
                                    <input type="number" className="hidden" readOnly name="id" value={x.source.id} />
                                    <textarea
                                        className="w-full text-xs p-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        name="caption"
                                        defaultValue={x.caption}
                                        rows={4}></textarea>
                                    <Menu as="div" className="relative">
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-gray-500 font-semibold">
                                                {x.uploaded && (
                                                    <>
                                                        <span className="text-green-400 text-lg">&#10003;</span> uploaded
                                                    </>
                                                )}
                                            </div>
                                            <Menu.Button className="block">
                                                <svg
                                                    className="h-6 w-6"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth="1.5"
                                                    stroke="currentColor"
                                                    aria-hidden="true">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                                    />
                                                </svg>
                                            </Menu.Button>
                                        </div>

                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-100"
                                            enterFrom="transform opacity-0 scale-95"
                                            enterTo="transform opacity-100 scale-100"
                                            leave="transition ease-in duration-75"
                                            leaveFrom="transform opacity-100 scale-100"
                                            leaveTo="transform opacity-0 scale-95">
                                            <Menu.Items className="absolute right-0 bottom-0 mt-2 w-44 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a
                                                            href={x.source.url}
                                                            className={`${
                                                                active ? 'bg-gray-200' : 'text-gray-900'
                                                            } block text-center w-full items-center rounded-t-md px-2 py-2 text-sm`}>
                                                            Open original
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            value="save"
                                                            name="action"
                                                            className={`${
                                                                active ? 'bg-gray-200' : 'text-gray-900'
                                                            } group w-full items-center px-2 py-2 text-sm`}>
                                                            Save
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            value="archive"
                                                            name="action"
                                                            className={`${
                                                                active ? 'bg-gray-200' : 'text-gray-900'
                                                            } group w-full items-center px-2 py-2 text-sm`}>
                                                            Archive
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            value="delete"
                                                            name="action"
                                                            className={`${
                                                                active ? 'bg-gray-200' : 'text-gray-900'
                                                            } group w-full items-center rounded-b-md px-2 py-2 text-sm`}>
                                                            Delete
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            </Menu.Items>
                                        </Transition>
                                    </Menu>
                                </Form>
                            </Post>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
