const MongoPopulate = require('./mongo-populate'),
    path = require('path');
const db = new MongoPopulate({host: 'localhost', dbname: 'cit_api'});

db.seed(path.join(__dirname, 'json'));
db.seed(path.join(__dirname, 'json/flights.json'));
db.seed([]);