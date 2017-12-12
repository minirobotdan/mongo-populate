const fs = require('fs'),
    path = require('path'),
    j2m = require('json2mongo'),
    mongodb = require('mongodb'),
    MongoClient = require('mongodb').MongoClient;

class MongoPopulate {

    constructor({ host, port = 27017, dbname, overwrite = false }) {

        if (!host || !dbname) {
            throw new Error('No host name or database name provided');
        }

        this.overwrite = overwrite;
        const connection = MongoClient.connect(`mongodb://${host}:${port}`, (err, connection) => {
            if(err) {
                throw(err);
            }
            this.db = connection.db(dbname);
        });
        
    }

    /**
     * Seeds the mongo database with the seed data passed, based on it's type.
     * @public 
     * @param seedData - Data or path to JSON with which to populate the collection. 
     *  Can be in one of 3 formats:
     *      - Path to directory containing JSON files
     *      - Path to singular JSON file
     *      - Single array of collection data (requires collection name to be specified)
     * @param collectionName - Optional parameter to override collection name. Required
     * @return Promise
     */
    async seed(seedData, collectionName) {

        if (Array.isArray(seedData)) {
            if (!collectionName) {
                throw new Error('Must provide a collection name if providing collection data as an array.');
            } else {
                return this.populateFromData(seedData, collectionName);
            }
        }

        const seedDataType = await this.checkSeedDataType(seedData);

        if (seedDataType.isDirectory()) {
            return this.populateFromFolder(seedData);
        } else if (seedDataType.isFile()) {
            return this.populateFromFile(seedData);
        }
    }

    /**
     * Asyncronously return the result of fs.stat to verify
     * @private
     * @param seedData
     * @return Promise<Stats>
     */
    async checkSeedDataType(seedData) {
        return new Promise((resolve, reject) => {
            fs.stat(seedData, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    /**
     * Populate the mongodb collection from a file path
     * @private
     * @return Promise
     */
    async populateFromFile(seedDataFile) {
        return this.readJsonFileAndInsert(null, seedDataFile);
    }

    /**
     * Populate the mongodb collection from a file folder
     * @private
     * @param seedDataDir The directory containing JSON collection files
     * @return Promise
     */
    async populateFromFolder(seedDataDir) {

        let promises = [],
            me = this,
            drop, create;

        return new Promise((resolve,reject) => {
            fs.readdir(seedDataDir, function (err, files) {
                if (err) {
                    throw err;
                }
    
                files.forEach(file => {
                    if (path.extname(file) != '.json') {
                        reject(new Error('Please ensure all files are in JSON format'));
                    }
                    promises.push(me.readJsonFileAndInsert(seedDataDir, file));
                });
                resolve(Promise.all(promises));
            });
        });
    }

    /**
     * Populate the mongodb collection from collection data or array of collection data.
     * @private
     * @param seedData An array of collection data
     * @param collectionName The name of the collection to operate on.
     * @return Promise
     */
    async populateFromData(seedData, collectionName) {
        console.debug('Populate from data', seedData, collectionName);
        let drop, create, collection;

        // Drop collection entirely to destroy all indexes, if overwrite specified.
        if (this.overwrite) {
            try {
                drop = await me.db.dropCollection(collectionName);
                create = await me.db.createCollection(collectionName);
            } catch(e) {
                throw(e);
            }
        }

        collection = await this.db.collection(collectionName);

        return await collection.insertMany(seedData, { w: 1 });
    }

    /**
     * 
     * @param {String} collectionName 
     * @return {Promise<Boolean>} exists
     */
    async collectionExists(collectionName) {
        const collections = await this.db.listCollections().toArray();
        let contains = false;
        collections.forEach(collection => {
            if(collection.name === collectionName) {
                contains = true;
            }
        });

        return contains;
    }

    async readJsonFileAndInsert(seedDataDir, file) {
        
        const me = this;
        const pathToFile = seedDataDir ? path.join(seedDataDir, file) : file;

        return new Promise((resolve, reject) => {
            fs.readFile(pathToFile, async function (err, data) {
                let collectionName = path.basename(file, '.json'), 
                    collection, collectionExists;
    
                if (err || !data) {
                    reject(err || new Error(`File ${file} is empty`));
                }
    
                // Drop collection entirely to destroy all indexes, if overwrite specified.
                if (me.overwrite) {
                    try {
                        collectionExists = await me.collectionExists(collectionName);
                        if (collectionExists) {
                            await me.db.dropCollection(collectionName);
                            await me.db.createCollection(collectionName);
                        }
                    } catch(e) {
                        throw(e);
                    }
                }
    
                collection = await me.db.collection(collectionName);
    
                let content = j2m(JSON.parse(data));
                resolve(collection.insertMany(content, { w: 1 }));
            });
        });
    }
}

module.exports = MongoPopulate;




