"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = require("./mysql");
const pg_1 = require("./pg");
const storage = {
    mysql: new mysql_1.MySqlStorage(),
    pg: new pg_1.PostgreSQLStorage()
};
exports.default = storage;
