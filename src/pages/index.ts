import { getKey } from './login';
import RedditPost from '../lib/reddit/post';
import type { Request, Response } from 'express';

export const approvePost = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { caption, accept, account } = req.body;
    const tokenId = getKey(req.cookies?.token);

    if (!id || !tokenId || accept === undefined) return void res.status(400).send('missing field from request body');

    const post = await RedditPost.fetch(id);
    if (!post) return void res.status(404).send('post not found');

    // console.log('approving post', accept, id, account); // DEBUG

    if (accept == '1') await post.approve(caption, account, tokenId);
    else await post.archive(tokenId);

    res.redirect('/');
};
