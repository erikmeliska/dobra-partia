import Link from 'next/link'
import { formatPostDate } from '@/lib/blog'

export default function BlogSekcia({ posts }) {
  if (!posts.length) return null

  return (
    <section id="blog" className="py-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-14">
        <span className="text-teal font-semibold text-sm uppercase tracking-wider">Blog</span>
        <h2 className="text-4xl font-bold text-navy mt-2">Z nášho blogu</h2>
      </div>
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
              <h3 className="text-lg font-bold text-navy mb-2">{post.title}</h3>
              <p className="text-gray-600 text-sm flex-grow">{post.perex}</p>
              <span className="text-teal font-semibold text-sm mt-4">
                Čítať viac <i className="fas fa-arrow-right ml-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="text-center mt-10">
        <Link
          href="/blog"
          className="inline-block bg-teal text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition"
        >
          Všetky články
        </Link>
      </div>
    </section>
  )
}
