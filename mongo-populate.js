const fs = require('fs'),
    path = require('path'),
    j2m = require('json2mongo'),
    mongodb = require('mongodb'),
    MongoClient = require('mongodb').MongoClient;

async function readFileAsync(pathToFile) {
    return new Promise((resolve, reject) => {
        fs.readFile(pathToFile, async function (err, fileContents) {
            if(err) {
                reject(err);
            } else {
                resolve(fileContents);
            }
        });
    });
}

async function readFolderAsync(path) {
    return new Promise((resolve,reject) => {
        fs.readdir(path, function (err, files) {
            if(err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

class MongoPopulate {

    constructor({ host, port = 27017, dbname, overwrite = false, verbose = false }) {

        if (!host || !dbname) {
            throw new Error('No host name or database name provided');
        }

        this.host = host;
        this.port = port;
        this.dbname = dbname;
        this.overwrite = overwrite;
        this.verbose = verbose;
        this.db = null;
    }

    /**
     * 
     */
    async connect() {
        return new Promise((resolve, reject) => {
            MongoClient.connect(`mongodb://${this.host}:${this.port}`, (err, connection) => {
                if(err) {
                    reject(err);
                }
                this.db = connection.db(this.dbname);
                resolve();
            });
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

        await this.connect();

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
            return this.readJsonFileAndInsert(null, seedData);
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
     * Populate the mongodb collection from a file folder
     * @private
     * @param seedDataDir The directory containing JSON collection files
     * @return Promise
     */
    async populateFromFolder(seedDataDir) {

        let promises = [],
            drop, 
            create,
            files;

        try {
            files = await readFolderAsync(seedDataDir);
        } catch(e) {
            throw(e);
        }
    
        files.forEach(file => {
            if (path.extname(file) != '.json') {
                reject(new Error('Please ensure all files are in JSON format'));
            }
            promises.push(this.readJsonFileAndInsert(seedDataDir, file));
        });
        
        return Promise.all(promises);
    }

    /**
     * Populate the mongodb collection from collection data or array of collection data.
     * @private
     * @param data An array of collection data
     * @param collectionName The name of the collection to operate on.
     * @return Promise
     */
    async populateFromData(data, collectionName) {
        let drop, create, collection, promises = [];

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

        collection = await this.db.collection(collectionName);

        return me.insertRecords(data, collection);
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
        
        const me = this,
            pathToFile = seedDataDir ? path.join(seedDataDir, file) : file,
            collectionName = path.basename(file, '.json');

        let collection, 
            collectionExists,
            fileContents; 
            
        try {
            fileContents = await readFileAsync(pathToFile);
        } catch(e) {
            throw(e);
        }

        if (!fileContents) {
            reject(new Error(`File ${file} is empty`));
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

        let data = j2m(JSON.parse(fileContents));
        
        return me.insertRecords(data, collection);
            
    }

    /**
     * Handler for promise rejection based anticipated Mongo errors.
     * @param {MongoError|insertOneWriteOpResultObject} err 
     */
    handleInsertion(results) {
        let finishedWithoutException = true,
            skipCount = 0;

        return new Promise((resolve, reject) => {
            results.forEach(result => {
                if(result instanceof Error && result.code === 11000) {
                    skipCount++;
                    if(this.verbose) {
                        console.log(`Duplicate id found, skipping record. Full message: ${result.message}`);
                    }
                } else if (result instanceof Error) {
                    finishedWithoutException = false;
                    reject(result);
                }
            });
    
            if(finishedWithoutException) {
                if(!this.overwrite) {
                    console.log(`Skipped ${skipCount} duplicate records`);
                }
                resolve(true);
            }
        });
    }

    /**
     * 
     * @param {Record[]} data 
     * @param {MongoCollection} collection 
     */
    async insertRecords(data, collection) {
        // Map all insertions to promise.
        let promises = data.map(record => {
            return new Promise((resolve, reject) => {
                collection.insert(record, { w: 1}, (err, result) => {
                    if(err) {
                        resolve(err);
                    } else {
                        resolve(result);
                    }
                });
            }); 
        });
        return Promise.all(promises).then(this.handleInsertion.bind(this));
    }
}

module.exports = MongoPopulate;




