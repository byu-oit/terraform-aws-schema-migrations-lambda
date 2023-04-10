import mysql, { type Connection } from 'mysql'
import { type GenericConnection } from './index'

let client: Connection | null = null

const connection: GenericConnection = {
  async connect (db) {
    return await new Promise((resolve, reject) => {
      if (client != null) { resolve(client); return }
      client = mysql.createConnection(db)
      client.connect(err => {
        if (err == null) { reject(err); return }
        resolve(client)
      })
    })
  },
  async close () {
    await new Promise((resolve, reject) => {
      if (client == null) { resolve(); return }
      client.end(err => {
        if (err != null) { reject(err); return }
        resolve()
      })
    })
  }
}

export default connection
