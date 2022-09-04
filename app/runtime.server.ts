import Instagram from 'src/lib/instagram/account';
import Queue from 'src/lib/reddit/queue';

let ig: Instagram;
let q: Queue;

declare global {
    var __ig__: Instagram;
    var __q__: Queue;
}

if (process.env.NODE_ENV === 'production') {
    ig = new Instagram();
    q = new Queue();
} else {
    if (!global.__ig__) global.__ig__ = new Instagram();
    if (!global.__q__) global.__q__ = new Queue();
    ig = global.__ig__;
    q = global.__q__;
}

export { ig, q as queue };
