import { Client } from 'pg'
import { GenericConnection } from './index'

let client: Client | null = null

const connection: GenericConnection = {
  async connect (db) {
    if (client != null) return client
    client = new Client(db)
    await client.connect()
    return client
  },
  async close () {
    if (client != null) {
      await client.end()
    }
  }
}

export default connection
