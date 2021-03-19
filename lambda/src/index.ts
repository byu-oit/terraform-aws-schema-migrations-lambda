import { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } from '@aws-sdk/client-codedeploy'
import { Umzug } from 'umzug'
import * as env from './util/env'
import { downloadMigrations } from './util/s3'
import { clients } from './clients'
import { storage } from './storage'

const { aws: { region }, db, migrations } = env.get()
const codeDeploy = new CodeDeployClient({ region })

// Get supported client
const client = clients[db.engine]
if (client == null) throw Error(`Unsupported database engine "${db.engine}"`)

// Setup schema migrations
// Umzug instance docs: https://github.com/sequelize/umzug/blob/master/src/types.ts
const umzug = new Umzug({
  storage: storage[db.engine],
  logger: console,
  context: { client, table: migrations.table },
  migrations: {
    glob: migrations.dir + '/*' // All files uploaded to the s3 bucket
  }
})

// export the type helper exposed by umzug, which will have the `context` argument typed correctly
export type Migration = typeof umzug._types.migration

export type Event = {
  // Incoming event from ECS lifecycle Hook looks something like this
  // TODO - It would be nice to update this type if/when AWS supports this lambda event type
  DeploymentId: string
  LifecycleEventHookExecutionId: string
  Combined?: string
} | Record<string, unknown>

export async function handler (event: Event): Promise<void> {
  let failed = false

  try {
    // Download migration files to the specified directory
    await downloadMigrations(migrations.bucket, migrations.dir)

    // Establish database connection for supported clients using a GenericConnection interface
    // See ./src/clients/index for GenericConnection type
    await client.connect(db)

    // Run schema migrations
    // It is best to write schema migrations as a transaction to avoid the possibility of partially executed
    // migrations. Umzug uses verror module to print human readable stack traces. An error thrown inside umzug
    // will print human-readable error messages using e.stack.
    // Migration Docs: https://github.com/sequelize/umzug#executing-pending-migrations
    // Error Docs: https://github.com/joyent/node-verror#verror-rich-javascript-errors
    await umzug.up()
  } catch (e) {
    failed = true
    console.error(e.stack)
    throw e
  } finally {
    // Close database connection
    await client.close()

    // Report lifecycle event hook status, if not combined
    // Note: This allows us to call the lambda from a lifecycle hook or invoke it directly. If invoked directly,
    // there is not need to respond to the code deploy lifecycle event.
    const { DeploymentId: deploymentId, LifecycleEventHookExecutionId: lifecycleEventHookExecutionId, Combined: combined } = event
    if (combined != null && typeof deploymentId === 'string' && typeof lifecycleEventHookExecutionId === 'string') {
      const putLifecycleEventHookExecutionStatusCommand = new PutLifecycleEventHookExecutionStatusCommand({
        deploymentId,
        lifecycleEventHookExecutionId,
        status: failed ? 'Failed' : 'Succeeded'
      })
      await codeDeploy.send(putLifecycleEventHookExecutionStatusCommand)
    }
  }
}

if (require.main === module) {
  handler({}).catch((e) => console.error(e))
}
