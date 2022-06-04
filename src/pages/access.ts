import { getKey } from './login';
import AccessKeys from '../lib/accesskeys';
import { Response, Request } from 'express';

export const getAccess = async (req: Request, res: Response) => {
    const { token } = req.cookies;
    if (!token || !(await AccessKeys.isOwner(getKey(token)))) return void res.redirect('/login');

    const keys = await AccessKeys.getKeys();
    res.render('access', { keys });
};
