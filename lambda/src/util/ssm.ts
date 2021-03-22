import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import * as env from './env'

const { aws: { region } } = env.get()
const ssm = new SSMClient({ region })

export async function fetchParameter (path: string): Promise<string> {
  const getParameterCommand = new GetParameterCommand({
    Name: path,
    WithDecryption: true
  })
  const { Parameter: parameter } = await ssm.send(getParameterCommand)
  if (parameter == null || parameter.Value == null) {
    throw Error(`Could not fetch SSM parameter with path "${path}"`)
  }
  return parameter.Value
}

export async function fetchParameters (...paths: string[]): Promise<string[]> {
  return await Promise.all(paths.map(fetchParameter))
}
