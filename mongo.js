const { MongoClient } = require('mongodb');

module.exports = class Mongo {
    constructor(url, database) {
        this.client = new MongoClient(url);
        this.db = this.client.db(database);
    }

    async connect() {
        await this.client.connect();
        console.log("Connected to Mongo server");
    }

    async find(collectionName, params) {
        const collection = this.db.collection(collectionName);
        const found = await collection.find(params).toArray();
        console.log(`Found document with id=${found._id}`);
        return found;
    }

    async findAll(collectionName) {
        const collection = this.db.collection(collectionName);
        const found = await collection.find({}).toArray();
        console.log(`Found ${found.length} document(s)`);
        return found;
    }

    async insert(collectionName, document) {
        const collection = this.db.collection(collectionName);
        const { insertedId } = await collection.insertOne(document);
        console.log(`Inserted document, id=${insertedId}`);
        return insertedId;
    }

    async delete(collectionName, documentId) {
        const collection = this.db.collection(collectionName);
        await collection.deleteOne({ _id: documentId });
        console.log(`Deleted document, id=${documentId}`);
    }

    disconnect() {
        this.client.close();
        console.log("Disconnected from Mongo server");
    }
}