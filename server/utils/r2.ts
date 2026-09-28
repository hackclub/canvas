import { AwsClient } from 'aws4fetch'

// Cloudflare R2 over its S3 API (https://developers.cloudflare.com/r2/api/s3/api/)
let client: AwsClient | undefined

function useR2() {
  const { r2 } = useRuntimeConfig()
  if (!r2.endpoint || !r2.bucket || !r2.accessKeyId || !r2.secretAccessKey) {
    throw new Error('R2 is not configured (see R2_* in .env.example)')
  }
  client ??= new AwsClient({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    service: 's3',
    region: r2.region,
  })
  return { client, bucketUrl: `${r2.endpoint.replace(/\/$/, '')}/${r2.bucket}` }
}

function objectUrl(bucketUrl: string, key: string) {
  return `${bucketUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
}

export async function putR2Object(key: string, body: Uint8Array, contentType: string) {
  const { client, bucketUrl } = useR2()
  const res = await client.fetch(objectUrl(bucketUrl, key), {
    method: 'PUT',
    // Copy into a plain ArrayBuffer-backed view, which is what fetch's types accept
    body: new Uint8Array(body),
    headers: { 'Content-Type': contentType },
  })
  if (!res.ok) {
    throw new Error(`R2 PUT ${key} failed: ${res.status} ${await res.text()}`)
  }
}

// Returns null if the object doesn't exist
export async function getR2Object(key: string) {
  const { client, bucketUrl } = useR2()
  const res = await client.fetch(objectUrl(bucketUrl, key))
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`R2 GET ${key} failed: ${res.status}`)
  }
  return res
}

// Deleting a missing object isn't an error in S3, so this is safe to call on stale keys
export async function deleteR2Object(key: string) {
  const { client, bucketUrl } = useR2()
  const res = await client.fetch(objectUrl(bucketUrl, key), { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${key} failed: ${res.status}`)
  }
}
