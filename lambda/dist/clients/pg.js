"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
let client = null;
const connection = {
    async connect(db) {
        if (client)
            return client;
        client = new pg_1.Client(db);
        await client.connect();
        return client;
    },
    async close() {
        if (client) {
            await client.end();
        }
    }
};
exports.default = connection;
