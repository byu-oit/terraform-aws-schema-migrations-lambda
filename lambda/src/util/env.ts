import * as path from 'path'
import env from 'env-var'

export interface EnvConfiguration {
  aws: AWSEnvConfiguration
  db: DBEnvConfiguration
  migrations: MigrationsEnvConfiguration
}

export interface AWSEnvConfiguration {
  region: string
}

export interface DBEnvConfiguration {
  engine: string // Should be postgres or mysql
  host: string
  port: number
  database: string
  user: string
  password: string
}

export interface MigrationsEnvConfiguration {
  table: string
  bucket: string
  dir: string
}

let config: EnvConfiguration | null = null

export function get (): EnvConfiguration {
  if (config == null) {
    const aws = {
      region: env.get('REGION').default('us-west-2').asString()
    }
    const db: DBEnvConfiguration = {
      engine: env.get('DB_ENGINE').default('postgres').asEnum(['mysql', 'postgres']),
      host: env.get('DB_HOST').required().asString(),
      port: env.get('DB_PORT').required().asPortNumber(),
      database: env.get('DB_NAME').required().asString(),
      user: env.get('DB_USERNAME').required().asString(),
      password: env.get('DB_PASSWORD').required().asString()
    }
    const migrations: MigrationsEnvConfiguration = {
      table: env.get('MIGRATIONS_TABLE').default('migrations').asString(),
      bucket: env.get('MIGRATIONS_BUCKET').required().asString(),
      // The /tmp directory is the only writeable directory for lambda
      // Docs: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
      dir: path.resolve('/tmp/migrations')
    }
    config = { aws, db, migrations }
  }
  return config
}

export function clear (): void {
  config = null
}
