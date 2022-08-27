import { createCookieSessionStorage, redirect } from '@remix-run/node';
import invariant from 'tiny-invariant';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config();

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set');

export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: '__session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets: [process.env.SESSION_SECRET],
        secure: process.env.NODE_ENV === 'production',
    },
});

export interface TokenData {
    id: number;
    is_admin: boolean;
}

const getSession = async (request: Request) => {
    const cookie = request.headers.get('Cookie');
    return sessionStorage.getSession(cookie);
};

const createSession = async (redirectTo: string, request: Request, data: TokenData, maxAge: number = 60 * 60 * 24 * 7) => {
    invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set');
    const token = jwt.sign({ ...data }, process.env.SESSION_SECRET, { expiresIn: '7d' });

    const session = await getSession(request);
    session.set('token', token);

    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await sessionStorage.commitSession(session, {
                maxAge,
            }),
        },
    });
};

const getToken = async (request: Request): Promise<TokenData | null> => {
    const session = await getSession(request);
    const token = session.get('token');
    if (!token) return null;
    return extractToken(token).catch(() => null);
};

const extractToken = async (token: string): Promise<TokenData> => {
    return new Promise<TokenData>((res, rej) => {
        invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set');

        try {
            jwt.verify(token, process.env.SESSION_SECRET, (err, data) => {
                if (err || typeof data == 'string') rej('Error or data was a string.');
                res(data as TokenData);
            });
        } catch (error) {
            rej('Invalid client side secret.');
        }
    });
};

const logout = async (request: Request) => {
    const session = await getSession(request);
    return redirect('/', {
        headers: {
            'Set-Cookie': await sessionStorage.destroySession(session),
        },
    });
};

export { createSession, getToken, logout };
