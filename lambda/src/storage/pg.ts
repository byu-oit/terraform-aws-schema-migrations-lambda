import {Client} from 'pg'
import {UmzugStorage, MigrationParams} from 'umzug'
import {StorageContext} from './index'

export class PostgreSQLStorage implements UmzugStorage<StorageContext<Client>> {
    async logMigration ({ name, path, context}: MigrationParams<StorageContext<Client>>) {
        const {client, table} = context
    }

    async unlogMigration ({ name, path, context}: MigrationParams<StorageContext<Client>>) {
        const {client, table} = context
    }

    async executed ({context}: Pick<MigrationParams<StorageContext<Client>>, 'context'>) {
        return []
    }
}
