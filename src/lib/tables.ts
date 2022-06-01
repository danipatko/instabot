import Table from './db/table';
import QueryBuilder from './db/builder';
import { run } from './db';

interface AdminTable {
    id: string;
    key: string;
    added: number;
    valid: 0 | 1;
}

const adminTable = new Table<AdminTable>('admin', { added: 'INTEGER', id: 'VARCHAR(20) PRIMARY KEY', key: 'TEXT', valid: 'BOOLEAN' });

export const test = async () => {
    // await adminTable.insert({ added: Date.now(), id: 'admin', key: 'admin', valid: 1 });
    // console.log('added to table');
    // const nonexistant = await adminTable.get(QueryBuilder.select<AdminTable>().from('admin').where('valid').is('1'));
    //console.log(nonexistant);
};
