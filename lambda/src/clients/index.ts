import mysql from './mysql'
import postgres from './postgres'
import { DBEnvConfiguration } from '../util/env'

export interface GenericConnection<Client = unknown> {
  connect: (db: DBEnvConfiguration) => Promise<Client>
  close: () => Promise<void>
}

export const clients: Record<string, GenericConnection> = {
  mysql,
  postgres
}
