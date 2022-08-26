import type { Parsed, CheckOptions, RequestData } from './types';
import type { NextFunction, Request, Response } from 'express';
import { getTokenCookie } from './index';
import { Types } from './types';

const parse = (val: any, T: Types | null): boolean | number | string | null => {
    switch (T) {
        case Types.number:
            const n = Number(val);
            return isNaN(n) ? null : n;
        case Types.bool:
            return val == 'true' || val == '1';
        case Types.object:
            try {
                return JSON.parse(val);
            } catch (_) {
                return null;
            }
        default:
            return val;
    }
};

const parseMany = (data: Record<string, any>, expect: Record<string, Types | null>): Parsed | null => {
    let result: Parsed = {};
    for (let [key, T] of Object.entries(expect)) {
        let value = data[key];
        if (value === undefined) return null;
        const parsed = parse(value.constructor.name === 'Array' ? value[0] : value, T);
        if (parsed === null) return null;
        result[key] = parsed;
    }
    return result;
};

/**
 * Check requests for authentication and parsing data
 */
const check = async <T extends Record<string, any>>({ req, level, ...fields }: CheckOptions): Promise<RequestData<T>> => {
    return new Promise<RequestData<T>>(async (res, rej) => {
        // auth
        const token = (await getTokenCookie(req)) ?? { admin: false, id: -1 };
        if (level > token.id) return void rej(401);
        if (level > 1 && !token.admin) return void rej(403);

        // check fields
        let data: Parsed = {};
        for (const [field, contents] of Object.entries(fields)) {
            // @ts-ignore
            const parsed = parseMany(req[field], contents);
            if (parsed === null) return void rej(400);
            data = { ...data, ...parsed };
        }

        res({ token, data: data as T });
    });
};

const err = (res: Response) => {
    return (error: number | any) => {
        if (typeof error == 'number') res.sendStatus(error);
        else res.sendStatus(404);
    };
};

const auth = (admin = false, exclude?: RegExp) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (exclude && exclude.exec(req.url)) {
            console.log('AUTH MATCHED AN EXCEPTION');
            return void next();
        }
        console.log(`Auth was called ${req.url}`);

        const token = await getTokenCookie(req);

        if (!token) return void res.sendStatus(401);
        if (admin && !token.admin) return void res.sendStatus(403);
        next();
    };
};

export { check, err, auth };
