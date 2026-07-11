'use server'

import { createDopyt } from '@/lib/dopyt'

export async function odosliDopyt(data) {
  const { success, message } = await createDopyt(data)
  return { success, message }
}
