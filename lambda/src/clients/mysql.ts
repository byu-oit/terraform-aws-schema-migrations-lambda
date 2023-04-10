import mysql, { type Connection } from 'mysql2'
import { type GenericConnection } from './index'

let client: Connection | null = null

const connection: GenericConnection = {
  async connect (db) {
    if (client != null) return client
    client = mysql.createConnection(db)
    client.connect()
    return client
  },
  async close () {
    if (client != null) {
      client.end()
    }
  }
}

export default connection
