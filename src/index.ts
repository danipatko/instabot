import express from 'express';
import RedditQuery from './lib/reddit/query';

const port = 3000;
const host = 'localhost';

const app = express();

app.get('/', (req, res) => {
    const q = RedditQuery.create('retarb')
        .search('dog')
        .sort('relevance')
        .build();
    console.log(q);
    res.send('bruah');
});

app.listen(port, () => console.log(`App listening on http://${host}:${port}`));
