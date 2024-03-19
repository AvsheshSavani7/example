import type { Metadata } from 'next'

export const metadata: Metadata = {
  openGraph: {
    title: 'Your page title',
    description: 'Your page description',
    url: 'https://vercel.com/',
    type: 'website',
    siteName: 'Vercel recipes',
    images: [
      {
        url: `https://${process.env.VERCEL_URL}/api/emoji`, //If your deployments are protected, replace with your absolute public production URL
      },
    ],
  },
}

export default function Page() {
  return <h1>Rendering an emoji in the image</h1>
}