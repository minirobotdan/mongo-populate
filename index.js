const MongoPopulate = require('./mongo-populate'),
    path = require('path'),
    db = new MongoPopulate({host: 'localhost', dbname: 'cit_test', overwrite: true});

// db.seed(path.join(__dirname, 'json')).then(() => {
//     process.exit();
// });
db.seed(path.join(__dirname, 'json/flights.json')).then(() => {
    process.exit();
});
//db.seed([], 'crews');