# mongo-populate
A small, modern, asynchronous library for seeding a MongoDB database with data, using ES2017 async/await syntax.

## Introduction
Very simple to use- just create an instance of MongoPopulate, pass in config parameters and call seed(), passing in a directory, singular file path or BSON array data.

Supports overwriting existing collections, or skipping records which already exist.

### Examples
```javascript
const MongoPopulate = require('mongo-populate');

const db = new MongoPopulate({
    host: 'localhost', // Required
    dbname: 'dbname', // Required
    username: 'username', // Optional
    password: 'password', // Optional
    // Overwrite existing matching records, will drop collection and recreate from input
    overwrite: false, // Optional, default: false
    // Console log details of each skipped record if overwrite is set to false.
    verbose: false // Optional, default: false
});

// Directory example 
await db.seed(path.join(__dirname, 'json'))

// Single file example
await db.seed(path.join(__dirname, 'json/single-collection.json'))

// Data example
await db.seed([{ _id: '5a129c0b42969849252f492e', foo: 'bar'}], 'crews')
```

## Wishlist
This was written to fulfil an internal gap in tooling on a project, but I can see some obvious rooms for improvement and PRs.

- More in depth MongoDB connection configuration (replica sets, SSL, connection pools, etc).
- More fine grain control over creation of records (upserts, etc).
- More logging options (pass in a log handler, Winston, etc).
- **Unit tests!** Sanity checked by hand for now, only used by myself for prototyping.

