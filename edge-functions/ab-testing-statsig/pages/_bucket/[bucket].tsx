import Head from 'next/head'
import {
  Layout,
  Text,
  Page,
  Button,
  Link,
  Snippet,
  Code,
} from '@vercel/examples-ui'
import { useRouter } from 'next/router'
import Cookie from 'js-cookie'

function BucketPage() {
  const {
    query: { bucket },
    reload,
  } = useRouter()

  function resetBucket() {
    Cookie.remove('uid')

    reload()
  }

  return (
    <Page className="flex flex-col gap-12">
      <Head>
        <title>AB testing with Statsig - Vercel Example</title>
        <meta
          name="description"
          content="Vercel example how to use ab-testing-statsig"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section className="flex flex-col gap-6">
        <Text variant="h1">AB testing with Statsig</Text>
        <Text>
          In this demo we use Statsig&apos;s Edge SDK to pull experiment variant
          and show the resulting allocation. As long as you have a bucket
          assigned you will always see the same result, otherwise you will be
          assigned a bucket to mantain the odds in 50/50.
        </Text>
        <Text>
          Buckets are statically generated at build time in a{' '}
          <Code>/_bucket/[bucket]</Code> page so its fast to rewrite to them.
        </Text>
        <Snippet>{`import { NextRequest, NextResponse } from 'next/server'
import statsig from 'statsig-node'

// Store a cookie for the user
const UID_COOKIE = 'uid'

export async function middleware(req: NextRequest) {
  // Clone the URL
  const url = req.nextUrl.clone()

  // Prevent users from access buckets directly
  if (url.pathname.startsWith(\`/_bucket\`)) {
    url.pathname = '/404'

    return NextResponse.rewrite(url)
  }

  // Just run for the / path
  if (req.nextUrl.pathname !== '/') {
    return NextResponse.next()
  }

  // Initialize statsig client
  await statsig.initialize(process.env.STATSIG_SERVER_API_KEY as string)

  // Get users UID from the cookie
  let userID = req.cookies[UID_COOKIE]

  // Set a userID if not present
  if (!userID) {
    userID = crypto.randomUUID()
  }

  // Fetch experiment
  const experiment = await statsig.getExperiment({ userID }, 'half_bucket')

  // Get bucket from experiment
  const bucket = experiment.get('name', 'a')

  // Change the pathname to point to the correct bucket
  url.pathname = \`/_bucket/\${bucket}\`

  // Create a response
  const response = NextResponse.rewrite(url)

  // Set cookie if not present
  if (!req.cookies[UID_COOKIE]) {
    response.cookie(UID_COOKIE, userID)
  }

  // Return the response
  return response
}
`}</Snippet>
        <Text>
          You can reset the bucket multiple times to get a different bucket
          assigned. You can configure your experiments, see diagnostics and
          results in your account{' '}
          <Link href="https://console.statsig.com/">Statsig console</Link>.
        </Text>
        <pre className="bg-black text-white font-mono text-left py-2 px-4 rounded-lg text-sm leading-6">
          bucket: {bucket}
        </pre>
        <Button size="lg" onClick={resetBucket}>
          Reset bucket
        </Button>
      </section>
    </Page>
  )
}

BucketPage.Layout = Layout

export default BucketPage
