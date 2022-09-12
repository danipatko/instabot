import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import Header from './components/Navbar';
import styles from './styles/app.css';

export function links() {
    return [{ rel: 'stylesheet', href: styles }];
}

export const meta: MetaFunction = () => ({
    charset: 'utf-8',
    title: 'Instabot',
    viewport: 'width=device-width,initial-scale=1',
});

export default function App() {
    return (
        <html lang="en">
            <head>
                <Meta />
                <Links />
                <script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>
            </head>
            <body>
                <Header />
                <Outlet />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
