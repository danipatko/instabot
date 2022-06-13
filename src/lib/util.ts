import { randomBytes } from 'crypto';

export const escape = (str: string): string => {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case '\0':
                return '\\0';
            case '\x08':
                return '\\b';
            case '\x09':
                return '\\t';
            case '\x1a':
                return '\\z';
            case '\n':
                return '\\n';
            case '\r':
                return '\\r';
            case '"':
            case "'":
            case '\\':
            case '%':
                return '\\' + char; // prepends a backslash to backslash, percent,
            // and double/single quotes
            default:
                return char;
        }
    });
};

export const randStr = (len: number) => randomBytes(Math.floor(len / 2)).toString('hex');

export const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export class Logs {
    private static instance: Logs;
    private logs: string = '';

    public static get _(): Logs {
        return this.instance || (this.instance = new this());
    }

    public static getLastThousand() {
        return this._.logs.split('\n').slice(0, 1000).join('\n');
    }

    public static getAll() {
        return this._.logs;
    }

    public static info(message: string) {
        console.log(message);
        this._.logs += `[INFO] (${new Date().toLocaleString()}) - ${message}\n`;
    }

    public static error(message: string) {
        console.error(message);
        this._.logs += `[ERROR] (${new Date().toLocaleString()}) - ${message}\n`;
    }
}
