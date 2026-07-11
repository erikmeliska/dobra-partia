import Link from 'next/link'
import { getPublishedPosts, formatPostDate } from '@/lib/blog'

export const metadata = {
  title: 'Blog | Dobrá Partia',
  description: 'Rady a tipy pre váš domov a záhradu od Dobrej Partie.',
  alternates: { canonical: 'https://www.dobrapartia.sk/blog' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/blog',
    title: 'Blog | Dobrá Partia',
    description: 'Rady a tipy pre váš domov a záhradu od Dobrej Partie.',
  },
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <main className="py-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-14">
        <span className="text-teal font-semibold text-sm uppercase tracking-wider">Blog</span>
        <h1 className="text-4xl font-bold text-navy mt-2">Rady a tipy pre váš domov</h1>
      </div>
      {posts.length === 0 ? (
        <p className="text-center py-16 text-gray-400">Zatiaľ tu nie sú žiadne články.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-2xl card-shadow overflow-hidden group flex flex-col"
            >
              {post.image && (
                <div className="overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow">
                <div className="text-gray-400 text-xs mb-2">{formatPostDate(post.createdAt)}</div>
                <h2 className="text-lg font-bold text-navy mb-2">{post.title}</h2>
                <p className="text-gray-600 text-sm flex-grow">{post.perex}</p>
                <span className="text-teal font-semibold text-sm mt-4">
                  Čítať viac <i className="fas fa-arrow-right ml-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
