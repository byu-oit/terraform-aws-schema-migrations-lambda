import { UmzugStorage } from 'umzug'
import { MySqlStorage } from './mysql'
import { PostgreSQLStorage } from './postgres'

export interface StorageContext<Client> {
  table: string
  client: Client
}

const storage: Record<string, UmzugStorage<any>> = {
  mysql: new MySqlStorage(),
  postgres: new PostgreSQLStorage()
}

export default storage
