import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { verifyWpAuth } from '@/lib/wp-auth'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getNextWpId() {
  const last = await prisma.blogPost.findFirst({ orderBy: { wpId: 'desc' } })
  return (last?.wpId ?? 0) + 1
}

async function resolveMediaUrl(mediaId) {
  if (!mediaId) return ''
  const media = await prisma.mediaUpload.findUnique({ where: { id: mediaId } })
  return media?.url || ''
}

function toWpResponse(post) {
  return {
    id: post.wpId,
    date: post.createdAt.toISOString(),
    modified: post.updatedAt.toISOString(),
    slug: post.slug,
    status: post.status,
    title: { rendered: post.title },
    content: { rendered: post.text },
    excerpt: { rendered: post.perex },
    featured_media: post.image ? 1 : 0,
    link: `/blog/${post.slug}`,
  }
}

// GET - list posts
export async function GET(request) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(posts.map(toWpResponse))
}

// POST - create post
export async function POST(request) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { title, content, excerpt, status, slug, date, featured_media } = body

    if (!title) {
      return NextResponse.json(
        { code: 'rest_missing_param', message: 'Missing required field: title' },
        { status: 400 }
      )
    }

    const postSlug = slug ? slugify(slug) : slugify(title)
    const wpId = await getNextWpId()
    const isPublished = status === 'publish'
    const imageUrl = await resolveMediaUrl(featured_media)

    const post = await prisma.blogPost.create({
      data: {
        wpId,
        title,
        slug: postSlug,
        text: content || '',
        perex: excerpt || '',
        image: imageUrl,
        status: isPublished ? 'publish' : 'draft',
        published: isPublished,
        createdAt: date ? new Date(date) : new Date(),
      },
    })

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath('/sitemap.xml')
    revalidatePath(`/blog/${post.slug}`)
    return NextResponse.json(toWpResponse(post), { status: 201 })
  } catch (error) {
    console.error('WP create post error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { code: 'rest_duplicate', message: 'A post with this slug already exists.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { code: 'rest_error', message: 'Failed to create post' },
      { status: 500 }
    )
  }
}
