import { randStr } from '../lib/util';
import { Request, Response } from 'express';
import RedditQuery from '../lib/reddit/query';

export const getQuery = async (req: Request, res: Response) => {
    res.render('query', { queries: await RedditQuery.getAll() });
};

export const addQuery = async (req: Request, res: Response) => {
    const { subreddit, q, sort, include_over_18, t, type, limit, interval } = req.body;
    if (!(subreddit && interval)) return void res.status(400).send('missing field from request body');

    const query = RedditQuery.from({ id: randStr(20), subreddit, type, t, q, sort, interval, enabled: 1, include_over_18, _limit: limit, max_duration: 0 });
    await query.create();

    res.redirect('/queries');
};

export const toggleQuery = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.status(400).send('missing field from request body');

    await (await RedditQuery.fetch(id))?.toggle();

    res.redirect('/queries');
};

export const removeQuery = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.status(400).send('missing field from request body');

    await RedditQuery.remove(id);
    res.redirect('/queries');
};
