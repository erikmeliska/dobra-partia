import { NextResponse } from 'next/server'
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

function toWpCategory(cat, postCount = 0) {
  return {
    id: cat.id,
    count: postCount,
    name: cat.name,
    slug: cat.slug,
    taxonomy: 'category',
    link: `/category/${cat.slug}`,
  }
}

// GET - list categories
export async function GET(request) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  const categories = await prisma.blogCategory.findMany({ orderBy: { id: 'asc' } })
  return NextResponse.json(categories.map(cat => toWpCategory(cat)))
}

// POST - create category
export async function POST(request) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, slug } = body

    if (!name) {
      return NextResponse.json(
        { code: 'rest_missing_param', message: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const catSlug = slug ? slugify(slug) : slugify(name)

    // Check if already exists
    const existing = await prisma.blogCategory.findUnique({ where: { slug: catSlug } })
    if (existing) {
      return NextResponse.json(toWpCategory(existing), { status: 200 })
    }

    const category = await prisma.blogCategory.create({
      data: { name, slug: catSlug },
    })

    return NextResponse.json(toWpCategory(category), { status: 201 })
  } catch (error) {
    console.error('WP create category error:', error)
    return NextResponse.json(
      { code: 'rest_error', message: 'Failed to create category' },
      { status: 500 }
    )
  }
}
