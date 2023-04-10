import { type UmzugStorage } from 'umzug'
import { MySqlStorage } from './mysql'
import { PostgreSQLStorage } from './postgres'

export interface StorageContext<Client> {
  table: string
  client: Client
}

export const storage: Record<string, UmzugStorage<any>> = {
  mysql: new MySqlStorage(),
  postgres: new PostgreSQLStorage()
}
