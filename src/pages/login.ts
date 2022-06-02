import jwt from 'jsonwebtoken';
import { randStr } from '../lib/util';
import AccessKeys from '../lib/db/tables/accesskeys';
import { NextFunction, Request, Response } from 'express';

const SECRET = process.env.SECRET ?? '_';

export const getLogin = async (req: Request, res: Response, next: NextFunction) => {
    // check if there is any key
    if (!(await AccessKeys.anyKey())) {
        // if not, generate one and give it to the first user
        const newKey = randStr(20);
        await AccessKeys.addKey({
            id: newKey,
            tag: 'Primary key (generated)',
            added: Date.now(),
            valid: 1,
        });
        // log in
        if (await login(res, newKey)) return void res.render('login', { firstLogin: true, key: newKey });
    }
    res.render('login', { firstLogin: false, key: undefined });
};

export const postLogin = async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.body;
    if (!token) return void res.status(400).send('missing token');
    if (await login(res, token)) res.redirect('/');
};

// log in a user (returns true if login was successful)
const login = async (res: Response, token: string): Promise<boolean> => {
    const key = await AccessKeys.fetch(token);
    if (!key || key.valid !== 1) {
        res.status(403).send('invalid token');
        return false;
    }

    const signed = jwt.sign({ token }, process.env.PRIVATE_TOKEN ?? '_', {
        expiresIn: '7d',
    });

    res.cookie('token', signed, { maxAge: 86_400_000, sameSite: 'strict' });
    return true;
};

// middleware for restricted routes
export const auth = (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.cookies;
    if (!token) return void res.redirect('/login');
    const id = jwt.verify(token, SECRET);
    if (!id) return void res.redirect('/login');
    next();
};
