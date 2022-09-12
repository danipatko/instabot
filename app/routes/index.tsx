import { LoaderArgs, redirect } from '@remix-run/node';
import { getToken } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
    const session = await getToken(request);
    if (!session) return redirect('/login');
    return null;
}

export default function Index() {
    return <div className="flex justify-center items-center min-h-full p-2 sm:px-6 lg:px-8"></div>;
}
