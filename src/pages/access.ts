import { getKey } from './login';
import { Logs, randStr } from '../lib/util';
import AccessKeys from '../lib/accesskeys';
import { Response, Request, NextFunction } from 'express';
import { IGAccount } from '../lib/insta/account';

// IGAccount._instance.enable();

export const authOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.cookies;
    if (!token || !(await AccessKeys.isOwner(getKey(token)))) return void res.redirect('/login');
    next();
};

const allDefined = (...args: any[]) => args.every((arg) => arg !== undefined);

export const getAccess = async (req: Request, res: Response) => {
    const keys = await AccessKeys.getKeys();
    const accounts = await IGAccount.getAll();

    res.render('access', {
        keys,
        accounts,
        logs: Logs.getLastThousand(),
        activity: { enabled: IGAccount._.enabled, progress: IGAccount._.progress, account: IGAccount._.current },
    });
};

export const toggleActivity = async (req: Request, res: Response) => {
    if (IGAccount._.enabled) IGAccount._.disable();
    else IGAccount._.enable();

    res.redirect('/access');
};

export const addAccount = async (req: Request, res: Response) => {
    const { username, password, post_target, follow_target, timespan } = req.body;
    await IGAccount.addAccount(username, password, timespan, post_target, follow_target);
    res.redirect('/access');
};

export const removeAccount = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.redirect('/access');
    await IGAccount.removeAccount(id);
    res.redirect('/access');
};

export const toggleAccount = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.sendStatus(400);

    const account = await IGAccount.fetch(id);
    if (!account) return void res.sendStatus(404);

    account.active = !account.active;
    await IGAccount.update(account);

    res.redirect('/access');
};

export const updateAccount = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.sendStatus(400);

    const { post_target, follow_target, follow_base, timespan } = req.body;
    if (!allDefined(post_target, follow_target, follow_base, timespan)) return void res.sendStatus(400);

    const account = await IGAccount.fetch(id);
    if (!account) return void res.sendStatus(404);

    account.timespan = parseFloat(timespan);
    account.post_target = parseInt(post_target, 10);
    account.follow_base = follow_base;
    account.follow_target = parseInt(follow_target, 10);

    await IGAccount.update(account);

    res.redirect('/access');
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
