import prisma from '@/lib/prisma'

export async function getPublishedPosts(limit) {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  })
}

export async function getPostBySlug(slug) {
  return prisma.blogPost.findUnique({ where: { slug } })
}

export function formatPostDate(date) {
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
