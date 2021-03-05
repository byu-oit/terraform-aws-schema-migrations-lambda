import {Connection} from 'mysql'
import {UmzugStorage, MigrationParams} from 'umzug'
import {StorageContext} from './index'

export class MySqlStorage implements UmzugStorage<StorageContext<Connection>> {
    async logMigration ({ name, path, context}: MigrationParams<StorageContext<Connection>>) {
        const {client, table} = context
    }

    async unlogMigration ({ name, path, context}: MigrationParams<StorageContext<Connection>>) {
        const {client, table} = context
    }

    async executed ({context}: Pick<MigrationParams<StorageContext<Connection>>, 'context'>) {
        return []
    }
}
