import fs from 'fs'
import { S3Client, ListObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import path from 'path'
import * as env from './env'

const { aws: { region } } = env.get()
const s3 = new S3Client({ region })

export async function downloadMigrations (bucket: string, downloadFolder: string): Promise<void> {
  // Ensure download folder exists and that it's empty
  fs.rmdirSync(downloadFolder, { recursive: true })
  fs.mkdirSync(downloadFolder)

  // List bucket contents
  const listObjectsCommand = new ListObjectsCommand({ Bucket: bucket })
  const { Contents: migrationFiles = [] } = await s3.send(listObjectsCommand)

  // Download files from migrations bucket
  const downloads = await Promise.all(migrationFiles.map(async file => {
    const { Key } = file
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key })
    const { Body } = await s3.send(getObjectCommand)
    // Object will always have a Key
    return { fileName: Key as string, content: Body }
  }))

  // Store all migrations locally
  await Promise.all(downloads.map(async ({ fileName, content }) => {
    const stream = fs.createWriteStream(path.join(downloadFolder, fileName))
    content.pipe(stream)
    return await new Promise((resolve, reject) => {
      stream.on('error', reject)
      stream.on('close', resolve)
    })
  }))

  // Log the downloaded migrations
  console.info(`Migration files downloaded:\n ${fs.readdirSync(downloadFolder).join('\n')}`)
}
