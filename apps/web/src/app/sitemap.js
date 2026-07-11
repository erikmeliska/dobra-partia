import { getPublishedPosts } from '@/lib/blog'

const BASE = 'https://www.dobrapartia.sk'

export default async function sitemap() {
  const posts = await getPublishedPosts()

  return [
    { url: `${BASE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/o-nas`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    ...posts.map(post => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
    { url: `${BASE}/ochrana-sukromia`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/obchodne-podmienky`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
