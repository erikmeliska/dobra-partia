export const STAVY_DOKLADU = ['inbox', 'spracovany', 'rucne']

export const STAV_DOKLADU_LABEL = {
  inbox: 'Inbox',
  spracovany: 'Spracovaný',
  rucne: 'Ručne',
  priradeny: 'Priradený',
}

export const OVERENIE_IKONA = {
  ekasa: '✅',
  ocr: '🤖',
  nic: '❔',
}

export function jePlatnyStavDokladu(stav) {
  return STAVY_DOKLADU.includes(stav)
}
