import mysql from './mysql'
import postgres from './postgres'
import { DBEnvConfiguration } from '../util/env'

export interface GenericConnection<Client = unknown> {
  connect: (db: DBEnvConfiguration) => Promise<Client>
  close: () => Promise<void>
}

const connections: Record<string, GenericConnection> = {
  mysql,
  postgres
}

export default connections
