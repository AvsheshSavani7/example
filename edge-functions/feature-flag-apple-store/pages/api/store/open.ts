import { set } from 'lib/upstash-redis'

export const config = {
  runtime: 'experimental-edge',
}

export default async function OpenStore() {
  try {
    const result = await set('store-closed', 'false')
    console.log(result)
    return new Response(
      JSON.stringify({ status: 'ok', message: 'Store is now open.' }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
