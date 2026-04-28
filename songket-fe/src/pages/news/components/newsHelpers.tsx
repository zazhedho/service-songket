export type ScrapedNews = {
  judul: string
  isi: string
  created_at: string
  sumber: string
  url: string
  from_db?: boolean
  category?: string
  source_id?: string
  source_url?: string
  images?: {
    foto_utama?: string
    dalam_berita?: string[]
  }
}

export type ToastTone = 'info' | 'success' | 'error' | 'warning'

export function shortText(value: string, max: number): string {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max)}...`
}

export function normalizeNewsUrl(raw: string): string {
  const input = String(raw || '').trim()
  if (!input) return ''
  try {
    const parsed = new URL(input)
    parsed.hash = ''
    parsed.search = ''
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    if (!parsed.pathname) parsed.pathname = '/'
    return parsed.toString().toLowerCase()
  } catch {
    return input.replace(/\/+$/, '').toLowerCase()
  }
}

export function toDetailRow(item: any): ScrapedNews {
  return {
    judul: item?.title || '',
    isi: item?.content || '',
    created_at: item?.published_at || item?.created_at || '',
    sumber: item?.source_name || item?.source?.name || '',
    url: item?.url || '',
    source_id: item?.source_id || '',
    category: item?.category || '',
    images: parseImages(item?.images),
    from_db: true,
  }
}

function parseImages(raw: any): { foto_utama?: string; dalam_berita?: string[] } {
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      data = {}
    }
  }
  const main = typeof data?.foto_utama === 'string' ? data.foto_utama : ''
  const list = Array.isArray(data?.dalam_berita) ? data.dalam_berita.filter((x: any) => typeof x === 'string') : []
  return { foto_utama: main, dalam_berita: list }
}
