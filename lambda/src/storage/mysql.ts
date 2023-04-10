import { type Connection, type FieldInfo } from 'mysql'
import { type UmzugStorage, type MigrationParams } from 'umzug'
import { type StorageContext } from './index'

export class MySqlStorage implements UmzugStorage<StorageContext<Connection>> {
  // Helper method for converting mysql query callback to promise
  static async query<T = unknown>(client: Connection, sql: string, params: unknown[] = []): Promise<[T[], FieldInfo[]]> {
    return await new Promise<any>((resolve, reject) => {
      return client.query(sql, params, (err, results, fields) => {
        if (err != null) { reject(err); return }
        resolve([results, fields])
      })
    })
  }

  async logMigration ({ name, context }: MigrationParams<StorageContext<Connection>>): Promise<void> {
    const { client, table } = context
    await MySqlStorage.query(client, 'insert into ?? (name) values (?)', [table, name])
  }

  async unlogMigration ({ name, context }: MigrationParams<StorageContext<Connection>>): Promise<void> {
    const { client, table } = context
    await MySqlStorage.query(client, 'delete from ?? where name = ?', [table, name])
  }

  async executed ({ context }: Pick<MigrationParams<StorageContext<Connection>>, 'context'>): Promise<string[]> {
    const { client, table } = context
    await MySqlStorage.query(client, 'create table if not exists ?? (name text)', [table])
    const [result] = await MySqlStorage.query<{ name: string }>(client, `select name from ${table}`)
    return result.map(({ name }) => name)
  }
}
