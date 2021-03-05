import {Client} from 'pg'
import {GenericConnection} from './index'

let client: Client | null = null

const connection: GenericConnection = {
    async connect (db) {
        if (client) return client
        client = new Client(db)
        await client.connect()
        return client
    },
    async close () {
        if (client) {
            await client.end()
        }
    }
}

export default connection
