import { getKey } from './login';
import { randStr } from '../lib/util';
import AccessKeys from '../lib/accesskeys';
import { Response, Request, NextFunction } from 'express';

export const authOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.cookies;
    if (!token || !(await AccessKeys.isOwner(getKey(token)))) return void res.redirect('/login');
    next();
};

export const getAccess = async (req: Request, res: Response) => {
    const keys = await AccessKeys.getKeys();
    res.render('access', { keys });
};

export const addKey = async (req: Request, res: Response) => {
    const { tag } = req.body;
    if (!tag) return void res.status(400).send('Tag is required');

    await AccessKeys.addKey({ tag, added: Date.now(), id: randStr(20), owner: 0, valid: 1 });
    res.redirect('/access');
};

export const toggleKey = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.status(400).send('missing id');

    await AccessKeys.toggleKey(id);
    res.redirect('/access');
};

export const removeKey = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.status(400).send('missing id');

    await AccessKeys.removeKey(id);
    res.redirect('/access');
};
