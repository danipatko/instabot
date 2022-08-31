import { ActionArgs, LoaderArgs, MetaFunction, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { getToken } from '~/session.server';
import { json } from '@remix-run/node';
import { ac } from '~/runtime.server';

export async function loader({ request }: LoaderArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');

    return json(ac.state);
}

export const meta: MetaFunction = () => ({
    title: 'Accounts & Activity',
});

export async function action({ request }: ActionArgs) {
    const token = await getToken(request);
    if (!token) return redirect('/login');

    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ message: `Invalid formdata.` });

    const action = fd.get('action')?.toString();
    if (!action) return json({ message: 'Failed to do action: bad request.' });

    switch (action) {
        case 'start':
            await ac.start();
            break;
        case 'stop':
            ac.stop();
            break;
        case 'reset':
            ac.reset();
            break;
        case 'update':
            await ac.update();
            break;
        case 'next':
            await ac.next();
            break;
    }

    return json({ message: '' });
}

const normalizeHours = (hours: number): string => {
    const hrs = Math.floor(hours);
    const mins = Math.floor((hours % 1) * 60);
    return hrs < 1 && mins < 1 ? 'less than a minute' : `${hrs} hour${hrs == 1 ? '' : 's'} ${mins} minute${mins == 1 ? '' : 's'}`;
};

export default function Overview() {
    const data = useLoaderData<typeof loader>();
    return (
        <div className="min-h-full p-2 md:flex md:justify-center sm:px-6 lg:px-8">
            <div className="space-y-4 px-5 md:w-[50vw] lg:w-[40vw]">
                <div className="p-2">
                    <Form method="post" reloadDocument>
                        <div className="flex justify-center gap-2">
                            {data.enabled ? (
                                <button className="button" name="action" value={'stop'}>
                                    Stop
                                </button>
                            ) : (
                                <button className="button" name="action" value={'start'}>
                                    Start
                                </button>
                            )}
                            <button className="button" name="action" value={'reset'}>
                                Reset
                            </button>
                            <button className="button" name="action" value={'update'}>
                                Update
                            </button>
                            <button className="button" name="action" value={'next'}>
                                Next
                            </button>
                        </div>
                    </Form>
                </div>
                {data.timepsan && (
                    <>
                        <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Timespan</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {normalizeHours(data.elapsed)} / {data.timepsan} hour{data.timepsan != 0 && 's'}
                            </dd>
                        </div>
                        <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500 sm:inline-flex sm:items-center">Current account</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{data.account}</dd>
                        </div>
                        {Object.entries(data.timings).map(([k, v], i) => (
                            <div key={i} className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm uppercase font-medium text-gray-500 sm:inline-flex sm:items-center">
                                    {k}
                                </dt>
                                <dd className="p-2 mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <div>
                                        <div className="w-full relative bg-gray-200 rounded-full">
                                            <div
                                                className="bg-indigo-700 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-l-full"
                                                style={{
                                                    width: `${(v.done / v.total) * 100}%`,
                                                }}></div>
                                        </div>
                                        <span className="text-gray-600">
                                            {v.done} out of {v.total}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-700">Next in {normalizeHours(v.next - data.elapsed)}</div>
                                    <div className="text-sm text-gray-700">Interval: {normalizeHours(v.interval)}</div>
                                </dd>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
