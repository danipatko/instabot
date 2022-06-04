import { run } from './db';
import Table from './db/table';

export const test = async () => {
    // await run('DROP TABLE admin');
    // await run('DROP TABLE query');
    /* await accessKeys.insert({
        added: Date.now(),
        id: 'admin',
        tag: 'main key',
        valid: 1,
    }); // */
    // console.log('added to table');
    // const nonexistant = await accessKeys.fetch('admin');
    // console.log(nonexistant);
};

export * from './accesskeys';
export * from './reddit/post';
