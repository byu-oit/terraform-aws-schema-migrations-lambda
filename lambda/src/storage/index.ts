import {UmzugStorage} from 'umzug'
import {MySqlStorage} from './mysql'
import {PostgreSQLStorage} from './pg'

export interface StorageContext<Client> {
    table: string
    client: Client
}

const storage: Record<string, UmzugStorage<any>> = {
    mysql: new MySqlStorage(),
    pg: new PostgreSQLStorage()
}

export default storage
