import {CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand} from '@aws-sdk/client-codedeploy'
import {S3Client, ListObjectsCommand, GetObjectCommand} from '@aws-sdk/client-s3'
import * as fs from 'fs/promises'
import * as path from 'path'
import {Umzug, MigrationError} from 'umzug'
import * as env from './util/env'
import clients, {GenericConnection} from './clients'
import storage from './storage'

type IncomingEvent = {
    DeploymentId: string
    LifecycleEventHookExecutionId: string
    Combined: string
}

const {aws: {region}, db, migrations} = env.get()

const codeDeploy = new CodeDeployClient({ region })
const s3 = new S3Client({ region })

export async function handler (event: IncomingEvent) {
    let failed = false
    let client: GenericConnection | null = null
    const {DeploymentId: deploymentId, LifecycleEventHookExecutionId: executionId, Combined: combined} = event

    try {
        // Download migration files
        await downloadMigrations(migrations.bucket, migrations.dir)

        // Establish database connection
        client = clients[db.engine]
        await client.connect(db)

        // Run schema migrations
        const umzug = new Umzug({
            storage: storage[db.engine],
            migrations: {glob: migrations.dir + '/*'},
            context: {client, table: migrations.table},
            logger: console
        })

        try {
            await umzug.up()
        } catch (e) {
            // Best effort to clean up failed migrations
            const matches = e.message.match(/^Migration (\w+) (up|down) failed$/)
            const [, migrationName, direction] = matches || []
            if (direction === 'up') await umzug.down({migrations: [migrationName]})

            // Throw original error to surface problem better
            // Docs: https://github.com/sequelize/umzug#errors
            if (e instanceof MigrationError) {
                throw e.cause()
            }

            // Throw other errors like normal
            throw e
        }
    } catch (e) {
        failed = true
        console.error(e.stack)
        throw e
    } finally {
        // Close database connection
        if (client) {
            await client.close()
        }

        // Report lifecycle event hook status, if not combined
        // Note: This allows us to call the lambda from a lifecycle hook or invoke it directly
        if (!combined) {
            const putLifecycleEventHookExecutionStatusCommand = new PutLifecycleEventHookExecutionStatusCommand({
                deploymentId: deploymentId,
                lifecycleEventHookExecutionId: executionId,
                status: failed ? 'Failed' : 'Succeeded'
            })
            await codeDeploy.send(putLifecycleEventHookExecutionStatusCommand)
        }
    }
}

async function downloadMigrations (bucket: string, downloadFolder: string) {
    // Ensure download folder exists
    await fs.mkdir(downloadFolder)

    // List bucket contents
    const listObjectsCommand = new ListObjectsCommand({Bucket: bucket})
    const {Contents: migrationFiles = []} = await s3.send(listObjectsCommand)

    // Download all migrations
    const downloads = await Promise.all(migrationFiles.map(async file => {
        const {Key} = file
        const getObjectCommand = new GetObjectCommand({Bucket: bucket, Key})
        const {Body} = await s3.send(getObjectCommand)
        // Object will always have a Key
        return {fileName: Key as string, content: Body}
    }))

    // Store all migrations locally
    await Promise.all(downloads.map(async ({fileName, content}) => {
        return fs.writeFile(path.join(downloadFolder, fileName), content)
    }))
}
