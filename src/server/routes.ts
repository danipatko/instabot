import { check, err, Types } from '../lib/auth';
import prisma, { Activity } from '../lib/db';
import { Fetch } from '@prisma/client';
import * as db from '../lib/db';
import express from 'express';

interface ID {
    id: number;
}

interface Name {
    username: string;
}

interface Pass {
    password: string;
}

interface Acc {
    account_id: number;
}

const idp = {
    params: { id: Types.number },
};

const router = express.Router();

router.post('/login', db.loginUser);

// USERS

router.get('/access', (req, res) => {
    check({ req, admin: true })
        .then(() => prisma.user.findMany())
        .then((users) => res.json({ users }))
        .catch(err(res));
});

router.post('/access/add', (req, res) => {
    check<Name>({ req, admin: true, body: { username: null } })
        .then(({ data }) => db.createUser(data.username))
        .then((user) => res.json({ user }))
        .catch(err(res));
});

router.delete('/access/:id', (req, res) => {
    check<ID>({ req, admin: true, ...idp })
        .then(({ data }) => db.deleteUser(data.id))
        .then((user) => res.json({ user }))
        .catch(err(res));
});

// ACCOUNTS

router.get('/accounts', (req, res) => {
    check({ req, admin: true })
        .then(() => prisma.account.findMany({ include: { _count: { select: { posts: true } } } }))
        .then((accounts) => res.json({ accounts }))
        .catch(err(res));
});

router.post('/accounts/add', (req, res) => {
    check<Name & Pass>({ req, admin: true, body: { username: null, password: null } })
        .then(({ data }) => db.createAccount(data.username, data.password))
        .then((account) => res.json({ account }))
        .catch(err(res));
});

router.delete('/accounts/:id', (req, res) => {
    check<ID>({ req, admin: true, ...idp })
        .then(({ data }) => db.deleteAccount(data.id))
        .then((id) => res.json(id))
        .catch(err(res));
});

// ACTIVITY

router.get('/activity', (req, res) => {
    check({ req, admin: false })
        .then(() =>
            prisma.activity.findMany({
                include: { accounts: { select: { username: true, id: true, _count: { select: { posts: true } } } } },
            })
        )
        .then((data) => res.json(data))
        .catch(err(res));
});

const activityType = {
    timespan: Types.number,
    post_target: Types.number,
    auto_upload: Types.bool,
    follow_queue: null,
    follow_target: Types.number,
    unfollow_queue: null,
    unfollow_target: Types.number,
};

router.get('/activity/add', (req, res) => {
    check<Activity>({ req, admin: false, body: { ...activityType } })
        .then(({ data }) => db.createActivity(data))
        .then((activity) => res.json({ activity }))
        .catch(err(res));
});

router.put('/activity/:id', (req, res) => {
    check<Activity & ID>({ req, admin: false, body: { ...activityType }, ...idp })
        .then(({ data }) => {
            const { id, ...rest } = data;
            return db.updateActivity(id, rest);
        })
        .then((activity) => res.json({ activity }))
        .catch(err(res));
});

router.delete('/activity/:id', (req, res) => {
    check<ID>({ req, admin: false, ...idp })
        .then(({ data }) => db.deleteActivity(data.id))
        .then((data) => res.json(data))
        .catch(err(res));
});

// QUERIES

router.get('/fetch', (req, res) => {
    check({ req, admin: false })
        .then(() => db.getFetch())
        .then((queries) => res.json({ queries }))
        .catch(err(res));
});

const fetchType = {
    q: null,
    sub: null,
    type: null,
    sort: null,
    limit: Types.number,
    enabled: Types.bool,
    over_18: Types.bool,
    timespan: Types.number,
    page_reset: Types.number,
};

router.post('/fetch/add', (req, res) => {
    check<Fetch>({ req, admin: false, ...fetchType })
        .then(({ data }) => db.createFetch(data))
        .then((fetch) => res.json({ fetch }))
        .catch(err(res));
});

router.put('/fetch/:id', (req, res) => {
    check<ID & Fetch>({ req, admin: false, ...fetchType, ...idp })
        .then(({ data }) => {
            const { id, ...rest } = data;
            return db.updateFetch(id, rest);
        })
        .then((fetch) => res.json({ fetch }))
        .catch(err(res));
});

router.delete('/fetch/:id', (req, res) => {
    check<ID>({ req, admin: false, ...idp })
        .then(({ data }) => db.deleteFetch(data.id))
        .then((fetch) => res.json({ fetch }))
        .catch(err(res));
});

// POSTS

router.get('/posts', (req, res) => {
    check({ req, admin: false })
        .then(() => db.getUnchecked())
        .then((posts) => res.json({ posts }))
        .catch(err(res));
});

router.get('/posts/archive', (req, res) => {
    check({ req, admin: false })
        .then(() => db.getArchive())
        .then((posts) => res.json({ posts }))
        .catch(err(res));
});

router.get('/posts/pending', (req, res) => {
    check({ req, admin: false })
        .then(() => db.getPending())
        .then((posts) => res.json({ posts }))
        .catch(err(res));
});

router.get('/posts/uploads', (req, res) => {
    check({ req, admin: false })
        .then(() => db.getUploaded())
        .then((posts) => res.json({ posts }))
        .catch(err(res));
});

router.post('/posts/:id/upload/:account_id', (req, res) => {
    check<ID & Acc>({ req, admin: false, params: { id: Types.number, account_id: Types.number } })
        .then(({ data }) => db.acceptPost(data.id, data.account_id))
        .then((post) => res.json({ post }))
        .catch(err(res));
});

router.post('/posts/:id/archive', (req, res) => {
    check<ID>({ req, admin: false, ...idp })
        .then(({ data }) => db.archivePost(data.id))
        .then((post) => res.json({ post }))
        .catch(err(res));
});

router.delete('/posts/:id', (req, res) => {
    check<ID>({ req, admin: false, ...idp })
        .then(({ data }) => db.deletePost(data.id))
        .then((ok) => res.json({ ok }))
        .catch(err(res));
});

export default router;
