# instabot API

### Users

`GET /login`

Basic login page with access token prompt.

`POST /login`

Submit access token, sign cookie, redirect /.

`GET /access`

Add/remove users, copy access tokens

`POST /access/add` (admin)

```json
{
    "username": string
}
```

Creates a new user account. Returns id, token and username.

`DELETE /access/:id` (admin)

Remove a user account.

### IG accounts

`GET /accounts` (admin)

List every instagram account registered.

`POST /accounts/add` (admin)

```json
{
    "username": string,
    "password": string
}
```

Create a new instagram account, no activity by default.

`DELETE /accounts/:id`

Remove an instagram account.

### Account activity

`GET /activity`

List all db activities, progress of current cycle.

`POST /activity/new`

```json
{
    // time before account switch
    "timespan": number,
    "post_target": number,
    // number of ppl to follow in a single timespan
    "follow_target": number,
    // comma separated ig ids to follow
    "follow_queue": string,
    "unfollow_target": number,
    "unfollow_queue":  string,
    "auto_upload":boolean

}
```

Create a new activity.

`UPDATE /activity/:id`

Create an existing activity.

`UPDATE /activity/:id/account/:id`

Link an account to an activity.

`DELETE /activity/:id`

Remove an activity

### Queries and fetching

`GET /fetch`

List all fetch settings.
