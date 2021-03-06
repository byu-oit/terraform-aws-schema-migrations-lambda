"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("./mysql"));
const pg_1 = __importDefault(require("./pg"));
const connections = {
    mysql: mysql_1.default,
    pg: pg_1.default
};
exports.default = connections;
