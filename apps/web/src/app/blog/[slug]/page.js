import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getPublishedPosts, formatPostDate } from '@/lib/blog'

export async function generateStaticParams() {
  const posts = await getPublishedPosts()
  return posts.map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post || !post.published) return {}
  return {
    title: `${post.title} | Dobrá Partia`,
    description: post.perex,
    alternates: { canonical: `https://www.dobrapartia.sk/blog/${post.slug}` },
    openGraph: {
      url: `https://www.dobrapartia.sk/blog/${post.slug}`,
      title: post.title,
      description: post.perex,
      type: 'article',
      ...(post.image ? { images: [post.image] } : {}),
    },
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post || !post.published) notFound()

  return (
    <main className="py-24 max-w-3xl mx-auto px-4">
      <Link href="/blog" className="text-teal font-semibold text-sm">
        <i className="fas fa-arrow-left mr-1" /> Späť na blog
      </Link>
      <h1 className="text-4xl font-bold text-navy mt-4 mb-3">{post.title}</h1>
      <div className="text-gray-400 text-sm mb-8">{formatPostDate(post.createdAt)}</div>
      {post.image && (
        <img src={post.image} alt={post.title} className="w-full rounded-2xl card-shadow mb-10" />
      )}
      <article
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: post.text }}
      />
    </main>
  )
}
