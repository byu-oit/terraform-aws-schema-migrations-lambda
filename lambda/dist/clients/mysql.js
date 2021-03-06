"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
let client = null;
const connection = {
    connect(db) {
        return new Promise((resolve, reject) => {
            if (client)
                return resolve(client);
            client = mysql_1.default.createConnection(db);
            return client.connect(err => {
                if (err)
                    return reject(err);
                return resolve(client);
            });
        });
    },
    close() {
        return new Promise((resolve, reject) => {
            if (!client)
                return resolve();
            return client.end(err => {
                if (err)
                    return reject(err);
                return resolve();
            });
        });
    }
};
exports.default = connection;
