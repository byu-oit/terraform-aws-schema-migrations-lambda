"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLStorage = void 0;
class PostgreSQLStorage {
    async logMigration({ name, context }) {
        const { client, table } = context;
        await client.query(`insert into ${table}(name) values(?)`, [name]);
    }
    async unlogMigration({ name, context }) {
        const { client, table } = context;
        await client.query(`delete from ${table} where name = ?`, [name]);
    }
    async executed({ context }) {
        const { client, table } = context;
        await client.query(`create table if not exists ${table}(name text)`);
        const { rows } = await client.query(`select name from ${table}`);
        return rows.map(({ name }) => name);
    }
}
exports.PostgreSQLStorage = PostgreSQLStorage;
