const { MongoClient } = require('mongodb');

const url = process.env.URI;
const dbName = 'myFiles'; 

let db;

async function connect() {
    if (db) {
        console.log('Using existing db connection');
        return db;
    }

    try {
        const client = new MongoClient(url);
        await client.connect();
        db = client.db(dbName);
        console.log('Connected to db');
        return db;
    } catch (error) {
        console.error('Error connecting to db:', error);
        throw error;
    }
}

module.exports = connect;
