import { ActionArgs, LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { acceptPost, deletePost, getArchive, removeArchives } from '~/models/post.server';
import { Form, useLoaderData } from '@remix-run/react';
import { Menu, Transition } from '@headlessui/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import Post from '~/components/Post';
import { Fragment } from 'react';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');
    return json(await getArchive());
}

export const meta: MetaFunction = () => ({
    title: 'Archived posts',
});

export async function action({ request }: ActionArgs) {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });
    const { id, action } = Object.fromEntries(fd);
    if (!(id && action)) return json({ message: `Failed to do action: bad request.` });

    const _id = Number(id);
    if (isNaN(_id)) return json({ message: `Failed to do action: malformed id.` });

    let ok = true;
    switch (action.toString()) {
        case 'remove':
            ok = await removeArchives();
            break;
        case 'upload':
            ok = await acceptPost(_id, 1);
            break;
        default:
            ok = await deletePost(_id);
            break;
    }

    return json({ message: ok ? '' : `Failed to update account.` });
}

export default function Posts() {
    const data = useLoaderData<typeof loader>();

    return (
        <div className="min-h-full flex justify-center p-2 sm:px-6 lg:px-8">
            <div className="max-w-md">
                <Form reloadDocument method="post">
                    <div className="text-center p-2">
                        <input type="number" name="id" className="hidden" readOnly value={0} />
                        <button className="button" name="action" value="remove">
                            Remove all
                        </button>
                    </div>
                </Form>
                <ul>
                    {data.map((x, i) => {
                        return (
                            <Post key={i} src={x}>
                                {/* @ts-ignore */}
                                <Form reloadDocument method="post">
                                    <input type="number" className="hidden" readOnly name="id" value={x.id} />
                                    <Menu as="div" className="relative">
                                        <div className="inline-flex mt-2 justify-end">
                                            <Menu.Button>
                                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
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
                                            leaveTo="transform opacity-0 scale-95"
                                        >
                                            <Menu.Items className="absolute right-0 bottom-0 mt-2 w-44 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <a href={x.url} className={`${active ? 'bg-gray-200' : 'text-gray-900'} block text-center w-full items-center rounded-t-md px-2 py-2 text-sm`}>
                                                            Open original
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button value="upload" name="action" className={`${active ? 'bg-gray-200' : 'text-gray-900'} group w-full items-center px-2 py-2 text-sm`}>
                                                            Upload
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            value="delete"
                                                            name="action"
                                                            className={`${active ? 'bg-gray-200' : 'text-gray-900'} group w-full items-center rounded-b-md px-2 py-2 text-sm`}
                                                        >
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
