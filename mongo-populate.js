const fs    = require('fs'),
    path    = require('path'),
    mongodb = require('mongodb'),
    Server  = mongodb.Server,
    Db      = mongodb.Db;


class MongoPopulate {
    
    constructor({ host, port = 27017, dbname }) {

        if(!host || !dbname) {
            throw new Error('No hostname or database name provided');
        }

        this.db = new Db(dbname, new Server(host, port));
    }

    /**
     * Seeds the mongo database with the seed data passed, based on it's type.
     * @public 
     * @param seedData
     * @return Promise
     */
    async seed(seedData) {

        if(Array.isArray(seedData)) {
            return this.populateFromData(seedData);
        }

        const seedDataType = await this.checkSeedDataType(seedData);
        
        if(seedDataType.isDirectory()) {
            return this.populateFromFolder(seedData);
        } else if(seedDataType.isFile()) {
            return this.populateFromFile(seedData);
        }
    }

    /**
     * Drops the database, asyncronously.
     * @public
     * @return Promise
     */
    async drop() {
        const connection = await this.db.open();
        return connection.dropDatabase();
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
                if(err) {
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
    async populateFromFile(seedData) {
        console.log('Populate from file', seedData);
    }

    /**
     * Populate the mongodb collection from a file folder
     * @private
     * @return Promise
     */
    async populateFromFolder(seedData) {
        console.log('Populate from folder', seedData);
    }

    /**
     * Populate the mongodb collection from collection data or array of collection data.
     * @private
     * @return Promise
     */
    async populateFromData(seedData) {
        console.log('Populate from data', seedData);
    }

}

module.exports = MongoPopulate;




