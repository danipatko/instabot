import { LoaderArgs, redirect } from '@remix-run/node';
import Switch from '~/components/Switch';
import { getToken } from '~/session.server';

export async function loader({ request }: LoaderArgs) {
    const session = await getToken(request);
    if (!session) return redirect('/login');
    return null;
}

export default function Index() {
    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
            <Switch name="" value={false} onClick={(s) => console.log(s)}></Switch>
        </div>
    );
}
