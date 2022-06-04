import { randStr } from '../lib/util';
import { Request, Response } from 'express';
import RedditQuery from '../lib/reddit/query';
import { queue } from '../lib/queue';

export const getQuery = async (req: Request, res: Response) => {
    res.render('query', { queries: await RedditQuery.getAll(), queue: queue.items });
};

export const addQuery = async (req: Request, res: Response) => {
    const { subreddit, q, sort, include_over_18, t, type, limit, interval } = req.body;
    if (!(subreddit && interval)) return void res.status(400).send('missing field from request body');

    const query = RedditQuery.from({ id: randStr(20), subreddit, type, t, q, sort, interval, enabled: 1, include_over_18, _limit: limit, max_duration: 0 });
    await query.create();

    queue.add(query.id);

    res.redirect('/queries');
};

export const toggleQuery = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.status(400).send('missing field from request body');

    const query = await RedditQuery.fetch(id);
    if (!query) return void res.status(404).send('query not found');
    await query.toggle();
    if (query.enabled) queue.add(id);
    else queue.disable(id);

    res.redirect('/queries');
};

export const removeQuery = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.status(400).send('missing field from request body');

    await RedditQuery.remove(id);
    queue.disable(id);

    res.redirect('/queries');
};
