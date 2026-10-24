import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomToken } from './crypto'
import { db } from './db'
import { storageDir } from './env'

type NewFile = {
  userId: string
  taskId?: string
  name: string
  mimeType: string
  kind: 'upload' | 'report'
  data: Buffer
}

/** Write a file to local storage and record it. Files are only served via signed URLs. */
export async function saveFile({ data, ...file }: NewFile) {
  const dir = join(storageDir, file.userId)
  await mkdir(dir, { recursive: true })
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = join(dir, `${randomToken(8)}-${safeName}`)
  await writeFile(path, data)
  return db.file.create({ data: { ...file, path, size: data.length } })
}
