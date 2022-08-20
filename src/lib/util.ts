import crypto from 'crypto';

const randstr = (n: number): string => crypto.randomBytes(n).toString('base64url');

export { randstr };
