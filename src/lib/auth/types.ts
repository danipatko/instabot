import type { Request } from 'express';

interface TokenData {
    id: number;
    admin: boolean;
}

enum Types {
    number = 0,
    bool = 1,
    object = 2,
}

interface CheckOptions {
    req: Request;
    level: number; // 0 - any, 1 - logged in, 2 - admin
    body?: Record<string, Types | null>;
    query?: Record<string, Types | null>;
    params?: Record<string, Types | null>;
}

interface RequestFields {
    body?: Record<string, any>;
    query?: Record<string, any>;
    params?: Record<string, any>;
}

interface RequestData<T extends RequestFields> {
    token: TokenData;
    data: T;
}

type Parsed = Record<string, string | boolean | number | object>;

export type { TokenData, CheckOptions, RequestData, RequestFields, Parsed };
export { Types };
