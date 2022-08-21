import type { Parsed, CheckOptions, RequestData } from './types';
import { getTokenDataCookie, getTokenDataExpress } from './index';
import type { Response } from 'express';
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
const check = async <T extends Record<string, any>>({ req, admin, ...fields }: CheckOptions): Promise<RequestData<T>> => {
    return new Promise<RequestData<T>>(async (res, rej) => {
        // auth
        const token = await getTokenDataExpress(req);
        if (!token) return void rej({ code: 401, msg: 'unauthorized' });
        if (admin && !token.admin) return void rej({ code: 403, msg: 'forbidden' });

        // check fields
        let data: Parsed = {};
        for (const [field, contents] of Object.entries(fields)) {
            // @ts-ignore
            const parsed = parseMany(req[field], contents);
            if (parsed === null) return void rej({ code: 400, msg: 'bad request' });
            data = { ...data, ...parsed };
        }

        res({ token, data: data as T });
    });
};

const err = (res: Response) => {
    return (error: { code: number; msg: string } | any) => {
        if (error['code'] && error['msg']) res.status(error.code).send(error.msg);
        else res.status(404).send('not found');
    };
};

export { check, err };
