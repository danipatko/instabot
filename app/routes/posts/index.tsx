import { acceptPost, archivePost, getPending } from '~/models/post.server';
import { ActionArgs, LoaderArgs, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { getToken } from '~/session.server';
import { Menu, Transition } from '@headlessui/react';
import { json } from '@remix-run/node';
import Post from '~/components/Post';
import { Fragment } from 'react';

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
                                <Form onSubmit={() => console.log('AAAAA')} method="post">
                                    <input type="number" className="hidden" readOnly value={x.id} />
                                    <Menu as="div" className="relative">
                                        <div className="inline-flex mt-2 justify-end">
                                            <Menu.Button>
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
                                                        <button
                                                            className={`${
                                                                active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                            } group w-full items-center rounded-md px-2 py-2 text-sm`}>
                                                            Open original
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            className={`${
                                                                active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                            } group w-full items-center rounded-md px-2 py-2 text-sm`}>
                                                            Upload
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            className={`${
                                                                active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                            } group w-full items-center rounded-md px-2 py-2 text-sm`}>
                                                            Archive
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            className={`${
                                                                active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                            } group w-full items-center rounded-md px-2 py-2 text-sm`}>
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
