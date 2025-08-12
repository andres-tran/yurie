import { baseUrl } from 'app/sitemap'
import { getBlogPosts } from 'app/blog/utils'

export async function GET() {
  let allBlogs = getBlogPosts()

  const itemsXml = allBlogs
    .sort((a, b) => {
      if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
        return -1
      }
      return 1
    })
    .map((post) => {
      const itemUrl = new URL(`/blog/${post.slug}`, baseUrl).toString()
      return `<item>
          <title>${post.metadata.title}</title>
          <link>${itemUrl}</link>
          <description>${post.metadata.summary || ''}</description>
          <pubDate>${new Date(post.metadata.publishedAt).toUTCString()}</pubDate>
        </item>`
    })
    .join('\n')

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
        <title>Yurie</title>
        <link>${new URL('/', baseUrl).toString()}</link>
        <description>Yurie RSS feed</description>
        ${itemsXml}
    </channel>
  </rss>`

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}
