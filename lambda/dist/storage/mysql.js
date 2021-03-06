"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySqlStorage = void 0;
class MySqlStorage {
    // Helper method for converting mysql query callback to promise
    static query(client, sql, params = []) {
        return new Promise((resolve, reject) => {
            return client.query(sql, params, (err, results, fields) => {
                if (err)
                    return reject(err);
                return resolve([results, fields]);
            });
        });
    }
    async logMigration({ name, context }) {
        const { client, table } = context;
        await MySqlStorage.query(client, `insert into ${table}(name) values ($1)`, [name]);
    }
    async unlogMigration({ name, context }) {
        const { client, table } = context;
        await MySqlStorage.query(client, `delete from ${table} where name = $1`, [name]);
    }
    async executed({ context }) {
        const { client, table } = context;
        await MySqlStorage.query(client, `create table if not exists ${table}(name text)`);
        const [result] = await MySqlStorage.query(client, `select name from ${table}`);
        return result.map(({ name }) => name);
    }
}
exports.MySqlStorage = MySqlStorage;
