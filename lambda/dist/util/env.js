"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clear = exports.get = void 0;
const path = __importStar(require("path"));
const env_var_1 = __importDefault(require("env-var"));
let config = null;
function get() {
    if (!config) {
        const aws = {
            region: env_var_1.default.get('REGION').default('us-west-2').asString()
        };
        const db = {
            engine: env_var_1.default.get('DB_ENGINE').default('pg').asEnum(['mysql', 'pg']),
            host: env_var_1.default.get('DB_HOST').required().asString(),
            port: env_var_1.default.get('DB_PORT').required().asPortNumber(),
            database: env_var_1.default.get('DB_NAME').required().asString(),
            user: env_var_1.default.get('DB_USERNAME').required().asString(),
            password: env_var_1.default.get('DB_PASSWORD').required().asString()
        };
        const migrations = {
            table: env_var_1.default.get('MIGRATIONS_TABLE').default('migrations').asString(),
            bucket: env_var_1.default.get('MIGRATIONS_BUCKET').required().asString(),
            dir: path.resolve('../../migrations')
        };
        config = { aws, db, migrations };
    }
    return config;
}
exports.get = get;
function clear() {
    config = null;
}
exports.clear = clear;
