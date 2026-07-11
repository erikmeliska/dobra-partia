import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyWpAuth } from '@/lib/wp-auth'

async function uploadLocal(file, buffer) {
  const { writeFile, mkdir } = await import('fs/promises')
  const { join } = await import('path')
  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  const filename = `${Date.now()}-${file.name || 'image.jpg'}`
  await writeFile(join(uploadsDir, filename), buffer)
  return { filename, url: `/uploads/${filename}` }
}

async function uploadBlob(file, buffer) {
  const { put } = await import('@vercel/blob')
  const filename = `${Date.now()}-${file.name || 'image.jpg'}`
  const blob = await put(filename, buffer, { access: 'public' })
  return { filename, url: blob.url }
}

// POST - upload media
export async function POST(request) {
  const authError = verifyWpAuth(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { code: 'rest_upload_no_file', message: 'No file provided.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { filename, url } = process.env.BLOB_READ_WRITE_TOKEN
      ? await uploadBlob(file, buffer)
      : await uploadLocal(file, buffer)

    const media = await prisma.mediaUpload.create({
      data: { filename, url },
    })

    return NextResponse.json({
      id: media.id,
      source_url: url,
      media_details: {
        file: filename,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('WP media upload error:', error)
    return NextResponse.json(
      { code: 'rest_error', message: 'Failed to upload media' },
      { status: 500 }
    )
  }
}
