import mysql, {Connection} from 'mysql'
import {GenericConnection} from './index'

let client: Connection | null = null

const connection: GenericConnection = {
    connect (db) {
        return new Promise((resolve, reject) => {
            if (client) return resolve(client)
            client = mysql.createConnection(db)
            return client.connect(err => {
                if (err) return reject(err)
                return resolve(client)
            })
        })
    },
    close () {
        return new Promise((resolve, reject) => {
            if (!client) return resolve()
            return client.end(err => {
                if (err) return reject(err)
                return resolve()
            })
        })
    }
}

export default connection
