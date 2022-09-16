import { useActionData, Form } from '@remix-run/react';
import { countUsers, getUserByToken, addUser } from '~/models/user.server';
import { ActionArgs, json } from '@remix-run/node';
import { createSession } from '~/session.server';

export async function action({ request }: ActionArgs) {
    if ((await countUsers()) == 0) {
        const { id, is_admin } = await addUser('admin', true);
        return createSession('/', request, { id, is_admin });
    }

    const body = await request.formData();
    const token = body.get('token');
    if (!token) return json({ message: `Missing field value.` });

    const user = await getUserByToken(token.toString());
    if (!user) return json({ message: 'Invalid access token.' });

    return createSession('/', request, user);
}

export default function Login() {
    const actionData = useActionData<typeof action>();

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl tracking-tight font-bold text-gray-900">Enter your access token</h2>
                </div>
                <Form className="mt-8 space-y-6" method="post">
                    <input type="hidden" name="remember" defaultValue="true" />
                    <div className="-space-y-px">
                        <div>
                            <label htmlFor="token" className="sr-only">
                                Access token
                            </label>
                            <input
                                id="token"
                                name="token"
                                type="password"
                                autoComplete="token"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Token"
                            />
                            {actionData && (
                                <div className="w-full py-2 px-4 text-sm font-medium text-red-600">{actionData.message}</div>
                            )}
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Sign in
                        </button>
                    </div>
                </Form>
            </div>
        </div>
    );
}
