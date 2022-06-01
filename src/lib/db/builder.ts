interface Row {
    id: string;
}

// only for fancy syntax. use as an SQL query
export default class QueryBuilder<T extends Row> {
    protected q: string[] = [];
    protected table: string = '';
    protected fields: (keyof T)[] = [];

    public static select<T extends Row>(...fields: (keyof T)[]): QueryBuilder<T> {
        const q = new QueryBuilder<T>();
        q.fields = fields;
        return q;
    }

    public from(table: string): QueryBuilder<T> {
        this.table = table;
        return this;
    }

    public where(field: keyof T): QueryBuilder<T> {
        this.q.push(field as string);
        return this;
    }

    public is(value: string | number): QueryBuilder<T> {
        this.q.push('=', typeof value === 'string' ? `"${value}"` : value.toString());
        return this;
    }

    public not(value: string | number): QueryBuilder<T> {
        this.q.push('<>', typeof value === 'string' ? `"${value}"` : value.toString());
        return this;
    }

    public or(field: keyof T): QueryBuilder<T> {
        this.q.push('OR', field as string);
        return this;
    }

    public and(field: keyof T): QueryBuilder<T> {
        this.q.push('AND', field as string);
        return this;
    }

    public get query(): string {
        let result: string[] = ['SELECT'];
        if (this.fields.length > 0) result.push(this.fields.join(','));
        else result.push('*');

        result.push('FROM', this.table);
        if (this.q.length > 0) result.push('WHERE', ...this.q);
        return result.join(' ');
    }
}
