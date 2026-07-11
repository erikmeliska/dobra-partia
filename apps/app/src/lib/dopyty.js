export const STAVY_DOPYTU = ['novy', 'kontaktovany', 'dokonceny']

export const STAV_LABEL = {
  novy: 'Nový',
  kontaktovany: 'Kontaktovaný',
  dokonceny: 'Dokončený',
}

export function jePlatnyStav(stav) {
  return STAVY_DOPYTU.includes(stav)
}
