import { Connection, FieldInfo } from 'mysql'
import { UmzugStorage, MigrationParams } from 'umzug'
import { StorageContext } from './index'

export class MySqlStorage implements UmzugStorage<StorageContext<Connection>> {
  // Helper method for converting mysql query callback to promise
  static async query<T = unknown>(client: Connection, sql: string, params: unknown[] = []): Promise<[T[], FieldInfo[]]> {
    return await new Promise<any>((resolve, reject) => {
      return client.query(sql, params, (err, results, fields) => {
        if (err != null) return reject(err)
        return resolve([results, fields])
      })
    })
  }

  async logMigration ({ name, context }: MigrationParams<StorageContext<Connection>>): Promise<void> {
    const { client, table } = context
    await MySqlStorage.query(client, `insert into ${table}(name) values ($1)`, [name])
  }

  async unlogMigration ({ name, context }: MigrationParams<StorageContext<Connection>>): Promise<void> {
    const { client, table } = context
    await MySqlStorage.query(client, `delete from ${table} where name = $1`, [name])
  }

  async executed ({ context }: Pick<MigrationParams<StorageContext<Connection>>, 'context'>): Promise<string[]> {
    const { client, table } = context
    await MySqlStorage.query(client, `create table if not exists ${table}(name text)`)
    const [result] = await MySqlStorage.query<{name: string}>(client, `select name from ${table}`)
    return result.map(({ name }) => name)
  }
}
