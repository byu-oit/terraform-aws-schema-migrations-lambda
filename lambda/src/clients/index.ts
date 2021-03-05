import mysql from './mysql'
import pg from './pg'
import {DBEnvConfiguration} from '../util/env'

export type GenericConnection<Client = unknown> = {
    connect: (db: DBEnvConfiguration) => Promise<Client>
    close: () => Promise<void>
}

const connections: Record<string, GenericConnection> = {
    mysql,
    pg
}

export default connections
