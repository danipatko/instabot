import ActivityCycle from 'src/lib/instagram/activity';

let ac: ActivityCycle;

declare global {
    var __ac__: ActivityCycle;
}

if (process.env.NODE_ENV === 'production') ac = new ActivityCycle();
else {
    if (!global.__ac__) global.__ac__ = new ActivityCycle();

    ac = global.__ac__;
}

export { ac };
