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

// GET - get single post
export async function GET(request, { params }) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  const { id } = await params
  const wpId = parseInt(id, 10)
  if (Number.isNaN(wpId)) {
    return NextResponse.json(
      { code: 'rest_post_invalid_id', message: 'Invalid post ID.' },
      { status: 404 }
    )
  }

  const post = await prisma.blogPost.findUnique({ where: { wpId } })
  if (!post) {
    return NextResponse.json(
      { code: 'rest_post_invalid_id', message: 'Invalid post ID.' },
      { status: 404 }
    )
  }

  return NextResponse.json(toWpResponse(post))
}

// PUT - update post (used for both update and unpublish)
export async function PUT(request, { params }) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  const { id } = await params
  const wpId = parseInt(id, 10)
  if (Number.isNaN(wpId)) {
    return NextResponse.json(
      { code: 'rest_post_invalid_id', message: 'Invalid post ID.' },
      { status: 404 }
    )
  }

  try {
    const body = await request.json()

    const existing = await prisma.blogPost.findUnique({ where: { wpId } })

    // Resolve featured_media to image URL
    let imageUrl = ''
    if (body.featured_media) {
      const media = await prisma.mediaUpload.findUnique({ where: { id: body.featured_media } })
      if (media) imageUrl = media.url
    }

    // If post was deleted, recreate it (upsert)
    if (!existing) {
      const postSlug = body.slug ? slugify(body.slug) : slugify(body.title || `post-${wpId}`)
      const isPublished = body.status === 'publish'

      const post = await prisma.blogPost.create({
        data: {
          wpId,
          title: body.title || '',
          slug: postSlug,
          text: body.content || '',
          perex: body.excerpt || '',
          image: imageUrl,
          status: isPublished ? 'publish' : 'draft',
          published: isPublished,
          createdAt: body.date ? new Date(body.date) : new Date(),
        },
      })

      revalidatePath('/')
      revalidatePath('/blog')
      revalidatePath('/sitemap.xml')
      revalidatePath(`/blog/${post.slug}`)
      return NextResponse.json(toWpResponse(post), { status: 201 })
    }

    // Update existing post
    const data = {}
    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) data.text = body.content
    if (body.excerpt !== undefined) data.perex = body.excerpt
    if (body.slug !== undefined) data.slug = slugify(body.slug)
    if (body.status !== undefined) {
      data.status = body.status
      data.published = body.status === 'publish'
    }
    if (imageUrl) data.image = imageUrl

    const post = await prisma.blogPost.update({
      where: { wpId },
      data,
    })

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath('/sitemap.xml')
    revalidatePath(`/blog/${post.slug}`)
    if (existing.slug !== post.slug) {
      revalidatePath(`/blog/${existing.slug}`)
    }
    return NextResponse.json(toWpResponse(post))
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { code: 'rest_duplicate', message: 'A post with this slug already exists.' },
        { status: 409 }
      )
    }
    console.error('WP update post error:', error)
    return NextResponse.json(
      { code: 'rest_error', message: 'Failed to update post' },
      { status: 500 }
    )
  }
}

// DELETE - delete post
export async function DELETE(request, { params }) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  const { id } = await params
  const wpId = parseInt(id, 10)
  if (Number.isNaN(wpId)) {
    return NextResponse.json(
      { code: 'rest_post_invalid_id', message: 'Invalid post ID.' },
      { status: 404 }
    )
  }

  const existing = await prisma.blogPost.findUnique({ where: { wpId } })
  if (!existing) {
    return NextResponse.json(
      { code: 'rest_post_invalid_id', message: 'Invalid post ID.' },
      { status: 404 }
    )
  }

  await prisma.blogPost.delete({ where: { wpId } })

  revalidatePath('/')
  revalidatePath('/blog')
  revalidatePath('/sitemap.xml')
  revalidatePath(`/blog/${existing.slug}`)

  return NextResponse.json({
    deleted: true,
    previous: toWpResponse(existing),
  })
}
