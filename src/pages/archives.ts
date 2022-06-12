import { Request, Response } from 'express';
import QueryBuilder from '../lib/db/builder';
import RedditPost, { IRedditPost } from '../lib/reddit/post';

export const getArchives = async (req: Request, res: Response) => {
    const archived = await RedditPost.get(QueryBuilder.select<IRedditPost>().from('redditpost').where('accepted').is(0).and('accepted_at').not(0).limit(10));
    res.render('archive', { archived });
};

export const clearArchives = async (req: Request, res: Response) => {
    const n = req.body;
    // 0 => purge all
    await RedditPost.purge(n ?? 0);
    res.redirect('/archived');
};

export const removeArchive = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.sendStatus(400);

    const { remove } = req.body;
    if (remove === undefined) return void res.sendStatus(400);
    console.log(remove);

    const post = await RedditPost.fetch(id);
    if (!post) return void res.sendStatus(404);

    if (remove == '1') await post.remove();
    else await post.unarchive();

    res.redirect('/archived');
};

export const moveToArchives = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return void res.sendStatus(400);

    const post = await RedditPost.fetch(id);
    post && (await post.archive(''));

    res.redirect('/waiting');
};

export const getWaiting = async (req: Request, res: Response) => {
    const waiting = await RedditPost.waiting();
    res.render('waiting', { waiting });
};
