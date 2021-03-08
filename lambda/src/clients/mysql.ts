import mysql, { Connection } from 'mysql'
import { GenericConnection } from './index'

let client: Connection | null = null

const connection: GenericConnection = {
  async connect (db) {
    return await new Promise((resolve, reject) => {
      if (client != null) return resolve(client)
      client = mysql.createConnection(db)
      return client.connect(err => {
        if (err == null) return reject(err)
        return resolve(client)
      })
    })
  },
  async close () {
    return await new Promise((resolve, reject) => {
      if (client == null) return resolve()
      return client.end(err => {
        if (err != null) return reject(err)
        return resolve()
      })
    })
  }
}

export default connection
