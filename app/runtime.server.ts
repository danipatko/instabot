import ActivityCycle from 'src/lib/instagram/activity';
import Instagram from 'src/lib/instagram/account';

let ac: ActivityCycle;
let ig: Instagram;

declare global {
    var __ac__: ActivityCycle;
    var __ig__: Instagram;
}

if (process.env.NODE_ENV === 'production') {
    ac = new ActivityCycle();
    ig = new Instagram();
} else {
    if (!global.__ac__) global.__ac__ = new ActivityCycle();
    if (!global.__ig__) global.__ig__ = new Instagram();

    ac = global.__ac__;
    ig = global.__ig__;
}

console.log('Events were assigned to AC');
ac.events.removeAllListeners();
ac.events.on('login', async () =>
    ig.loadAccount(ac.currentAccount).then((ok) => {
        if (!ok) ac.reset();
    })
);
ac.events.on('post', () => ig.post());
ac.events.on('follow', () => ig.followNext());
ac.events.on('unfollow', () => ig.unfollowNext());

export { ac, ig };
