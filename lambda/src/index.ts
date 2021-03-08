import { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } from '@aws-sdk/client-codedeploy'
import { Umzug } from 'umzug'
import * as env from './util/env'
import { downloadMigrations } from './util/s3'
import clients, { GenericConnection } from './clients'
import storage from './storage'

const { aws: { region }, db, migrations } = env.get()
const codeDeploy = new CodeDeployClient({ region })

export async function handler (event: {
  // Incoming event from ECS lifecycle Hook looks something like this
  // TODO - It would be nice to update this type if/when AWS supports this lambda event type
  DeploymentId: string
  LifecycleEventHookExecutionId: string
  Combined?: string
}): Promise<void> {
  let failed = false
  let client: GenericConnection | null = null
  const { DeploymentId: deploymentId, LifecycleEventHookExecutionId: executionId, Combined: combined } = event

  try {
    // Download migration files to the specified directory
    await downloadMigrations(migrations.bucket, migrations.dir)

    // Establish database connection using supported clients using a GenericConnection
    // See ./src/clients/index for GenericConnection type
    client = clients[db.engine]
    await client.connect(db)

    // Setup schema migrations
    // Umzug instance docs: https://github.com/sequelize/umzug/blob/master/src/types.ts
    const umzug = new Umzug({
      storage: storage[db.engine],
      migrations: { glob: migrations.dir + '/*' },
      context: { client, table: migrations.table },
      logger: console
    })

    // Run schema migrations
    // It is best to write schema migrations as a transaction to avoid the possibility of partially executed
    // migrations. Umzug uses verror module to print human readable stack traces. An errors thrown inside umzug
    // will print good error messages using e.stack.
    // Migration Docs: https://github.com/sequelize/umzug#executing-pending-migrations
    // Error Docs: https://github.com/joyent/node-verror#verror-rich-javascript-errors
    await umzug.up()
  } catch (e) {
    failed = true
    console.error(e.stack)
    throw e
  } finally {
    // Close database connection
    if (client != null) {
      await client.close()
    }

    // Report lifecycle event hook status, if not combined
    // Note: This allows us to call the lambda from a lifecycle hook or invoke it directly. If invoked directly,
    // there is not need to respond to the code deploy lifecycle event.
    if (combined != null) {
      const putLifecycleEventHookExecutionStatusCommand = new PutLifecycleEventHookExecutionStatusCommand({
        deploymentId: deploymentId,
        lifecycleEventHookExecutionId: executionId,
        status: failed ? 'Failed' : 'Succeeded'
      })
      await codeDeploy.send(putLifecycleEventHookExecutionStatusCommand)
    }
  }
}
