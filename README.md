# instabot
Epic content generator and follower bot, extended with a web interface.
## Features
- admin interface: manage access and account activity
- reddit queries: automate fetching content from reddit
- content selector: approve posts before uploading
- multiple accounts: use more than one instagram account
- following people: follow an account's followers to grow your page

## Setup
_Dockerfile soon_
- clone the repository
- install dependencies ```npm i```
- create an empty `sqlite.db` file in the project directory 
- run with ```npm run server```  
by default the server should launch at localhost:3000

### Requirements
- nodejs 16+
- ffmpeg added to PATH

## DISCLAIMER: RISK OF ACCOUNT BAN
I'm almost certain that automating user activity violates instagram's TOS, which can result in a permanent ban. Only you are responsible for your accounts.

## Usage
When you first open the site, you will be prompted a login token. This is the only admin key, that cannot be changed or removed so make sure to make a copy of it. Use this to access the admin page.
### Getting content from reddit
You can add/toggle/remove queries in the `/queries` page.  
| Option | Type | Value |
|----------|-------------|------|
| subreddit | string | the name of the subreddit to fetch a post from (**excluding the r/ prefix**) |
| category | hot/new/best/rising/search | sort by category. when set to search, a search phrase must be provided |
| search phrase | string | search for a specific phrase in the title |
| sort | relevance/comments/hot/top/new | sort search results. **only applies when searching** |
| time | hour/day/week/month/year/all | filter when the post was created |
| nsfw | boolean | allow not-safe-for-work content to be queried |
| limit | number | number of posts to fetch in one iteration. if zero or omitted, defaults to 27. it is recommended to set limit to 1 and increase the query frequency instead, because processing videos with ffmeg may overload the server |
| interval | number | (in hours) the time to wait before the next query |
| pages | number | paging is important to avoid fetching the same posts over time. e.g. if pages is 10 and limit is 2, the bot will fetch 20 contigious posts under 10 iterations, then reset paging |
| account | IGAccount | the default account to upload the fetched posts from. may be changed later in the content selector page |

### Managing downloaded content
Uploading content **requires user approval**. The reason for this, is simply because uploading content straight from reddit can get you banned very quickly. On the index page, you can select the content you want to upload. You can choose which account to upload the post from, and edit the caption of the instagram post (by default it is the title of the original post, credit to the author and a reddit link). Hit accept to place the post in a waiting queue. You can view and archive posts waiting for upload in the `/waiting` page. Hit archive to place the post in the archives (`/archived`). It's recommended to keep these archives for a couple of days, to prevent fetching them again. You can remove N posts at the top. If N is 0, all archived posts will be finally deleted.

### Managing account activity
Manage accounts in the admin page `/access`. Before adding an account, make sure to disable 2FA. Each account has a *follow target*, and a *post target*, which tells the bot how many people to follow/posts to make under the defined *timespan*. Please note that there is a rate limit of ~300 actions/day to prevent API spam (which could lead to a ban). For this reason, posting is prioritized over following to fit the rate limit. Both posting and following is distributed evenly under the specified timespan. Click enable below account activity to start the cycle.
#### Multiple accounts
The problem is, there can only be one client at a time, so there is an account queue. After an account's timespan ends, it gets logged out and the next account in the queue gets logged in. **!!** I actually haven't tested this yet, but I have a strong feeling that frequent logins/logouts will lead to two-factor authentication or some other sort of confirmaton which is not yet handled.

### Manage access
You can share the site with anyone by generating an access key for them. Generated keys cannot access the admin page. 
