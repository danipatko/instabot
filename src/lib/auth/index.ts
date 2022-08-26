import type { Request, Response } from 'express';
import type { TokenData } from './types';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';
config();

const createJWT = (data: TokenData | object, maxAge: string | undefined, issuer: string = 'sys'): string => {
    const { SECRET } = process.env;
    if (!SECRET) throw new Error('Could not get secret from environment.');
    return jwt.sign({ ...data }, SECRET, { ...(maxAge && { expiresIn: maxAge }), issuer });
};

const signAPIToken = (data: TokenData, issuer: string): string => createJWT(data, '7d', issuer);

const signSessionToken = (data: TokenData, res: Response): void => {
    res.cookie('token', createJWT(data, '7d'));
};

const getToken = (cookie: string): string | null => {
    const match = /token=(([a-zA-Z0-9_]+\.){2}[a-zA-Z0-9_]+)(&|$)/gm.exec(cookie);
    return match ? match[1] : null;
};

const getTokenData = async (token: string): Promise<TokenData> => {
    return new Promise<TokenData>((res, rej) => {
        const { SECRET } = process.env;
        if (!SECRET) throw new Error('Cannot find secret in environment.');

        try {
            jwt.verify(token, SECRET, (err, data) => {
                if (err || typeof data == 'string') rej('Error or data was a string.');
                res(data as TokenData);
            });
        } catch (error) {
            rej('Invalid client side secret.');
        }
    });
};

const getTokenCookie = async (req: Request): Promise<TokenData | undefined> => {
    if (!req.cookies) return;
    const { token } = req.cookies;
    if (token) return await getTokenData(token);
};

const getTokenDataBearer = async (req: Request): Promise<TokenData | undefined> => {
    const authHeader = req.headers.authorization;
    if (authHeader) return await getTokenData(authHeader.split(/\s+/g)[1]); // Authorization: Bearer xxx-xxx
};

export { /*signAPIToken,*/ signSessionToken, /*getTokenDataBearer,*/ getTokenCookie, getToken };
export * from './types';
export * from './check';
