import crypto from 'crypto';

const randstr = (n: number): string => crypto.randomBytes(n).toString('base64url');

const defaultCaption = (title: string, author: string, url: string) => `${title}\nCredit to ${author}\n${url}`;

export { randstr, defaultCaption };
