'use server'

import { createDopyt } from '@/lib/dopyt'

export async function odosliDopyt(data) {
  if (data.web) return { success: true, message: 'Dopyt bol prijatý' }
  const { success, message } = await createDopyt(data)
  return { success, message }
}
