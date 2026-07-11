import bcrypt from 'bcryptjs'

export async function verifyCredentials(db, email, password) {
  if (!email || !password) return null
  const u = await db.uzivatel.findUnique({ where: { email } })
  if (!u) return null
  const ok = await bcrypt.compare(password, u.passwordHash)
  if (!ok) return null
  return { id: u.id, name: u.meno, email: u.email, partiaId: u.partiaId }
}
