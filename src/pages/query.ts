import { NextFunction, Request, Response } from 'express';
import RedditQuery from '../lib/reddit/query';

export const getQuery = async (req: Request, res: Response) => {
    const queries = await RedditQuery.getAll();
    console.log(queries);

    res.render('query', { queries });
};

export const addQuery = async (req: Request, res: Response) => {
    const { subreddit } = req.body;
    if (!subreddit)
        return void res.status(400).send('missing field from request body');

    console.log(subreddit);

    const queries = await RedditQuery.getAll();
    res.render('query', { queries });
};
