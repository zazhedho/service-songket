const DIRECT_TRANSLATIONS: Record<string, string> = {
  'Kembali': 'Back',
  'Kembali ke Tabel': 'Back to Table',
  'Pilih': 'Select',
  'Semua': 'All',
  'Batal': 'Cancel',
  'Hapus': 'Delete',
  'Lihat': 'View',
  'Simpan': 'Save',
  'Menyimpan...': 'Saving...',
  'Tidak': 'No',
  'Ya': 'Yes',
  'Aktif': 'Active',
  'Non Aktif': 'Inactive',
  'Nama': 'Name',
  'Nama Pekerjaan': 'Job Name',
  'Pekerjaan': 'Job',
  'Provinsi': 'Province',
  'Kabupaten': 'Regency',
  'Kabupaten/Kota': 'Regency/City',
  'Kecamatan': 'District',
  'Kelurahan': 'Village',
  'Alamat': 'Address',
  'Telepon': 'Phone',
  'Waktu': 'Time',
  'Waktu Pooling': 'Pooling Time',
  'Waktu Hasil': 'Result Time',
  'Waktu Attempt': 'Attempt Time',
  'Catatan': 'Notes',
  'Catatan Order': 'Order Notes',
  'Hasil': 'Result',
  'Status Order': 'Order Status',
  'Update Terakhir': 'Last Updated',
  'Belum punya akun? Register': "Don't have an account? Register",
  'Menu tidak ditemukan': 'Menu not found',
  'Permission tidak ditemukan': 'Permission not found',
  'Roles & Access': 'Roles & Access',
  'Form Order In': 'Order Form',
  'Input Role Baru & Access': 'Create Role & Access',
  'Input Order In': 'Create Order',
  'Input Menu Baru': 'Create New Menu',
  'Input Nama Pekerjaan': 'Create Job Name',
  'Input Angsuran': 'Create Installment',
  'Input Net Income': 'Create Net Income',
  'Input Dealer Baru': 'Create New Dealer',
  'Input Finance Company Baru': 'Create New Finance Company',
  'Input Jenis Motor': 'Create Motor Type',
  'Detail Menu': 'Menu Details',
  'Detail Order': 'Order Details',
  'Detail Angsuran': 'Installment Details',
  'Detail Net Income': 'Net Income Details',
  'Detail Nama Pekerjaan': 'Job Name Details',
  'Detail Jenis Motor': 'Motor Type Details',
  'Daftar Menu': 'Menu List',
  'Daftar Role': 'Role List',
  'Daftar User': 'User List',
  'Daftar Pekerjaan': 'Job List',
  'Daftar Angsuran': 'Installment List',
  'Daftar Net Income': 'Net Income List',
  'Daftar Jenis Motor': 'Motor Type List',
  'Informasi path dan konfigurasi menu': 'Route and menu configuration details',
  'Belum ada menu.': 'No menus yet.',
  'Pilih dealer': 'Select dealer',
  'Order terbaru': 'Latest orders',
  'Masuk untuk melanjutkan ke dashboard.': 'Sign in to continue to the dashboard.',
  'Buat akun baru untuk akses sistem.': 'Create a new account to access the system.',
  'Data berhasil dimasukkan': 'Data imported successfully',
}

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^Input\s+(.+)$/i, 'Create $1'],
  [/^Detail\s+(.+)$/i, '$1 Details'],
  [/^Daftar\s+(.+)$/i, '$1 List'],
  [/^Cari\s+(.+)$/i, 'Search $1'],
  [/^Tambah\s+(.+)$/i, 'Add $1'],
  [/^Hapus\s+(.+)\?$/i, 'Delete $1?'],
  [/^Edit\s+(.+)$/i, 'Edit $1'],
  [/^Pilih\s+(.+)\.$/i, 'Select $1.'],
  [/^Pilih\s+(.+)$/i, 'Select $1'],
  [/^(.+)\s+wajib diisi$/i, '$1 is required'],
  [/^(.+)\s+wajib dipilih$/i, '$1 must be selected'],
  [/^Belum ada\s+(.+)\.$/i, 'No $1 yet.'],
  [/^Belum ada\s+(.+)$/i, 'No $1 yet'],
  [/^Tidak ada izin melihat\s+(.+)\.$/i, 'No permission to view $1.'],
  [/^Tidak ada izin melihat\s+(.+)$/i, 'No permission to view $1'],
  [/^Tidak ada izin membuat\s+(.+)\.$/i, 'No permission to create $1.'],
  [/^Tidak ada izin membuat\s+(.+)$/i, 'No permission to create $1'],
  [/^Tidak ada izin mengubah\s+(.+)\.$/i, 'No permission to update $1.'],
  [/^Tidak ada izin mengubah\s+(.+)$/i, 'No permission to update $1'],
  [/^Tidak ada izin menghapus\s+(.+)\.$/i, 'No permission to delete $1.'],
  [/^Tidak ada izin menghapus\s+(.+)$/i, 'No permission to delete $1'],
  [/^Tidak ada izin\s+(.+)\.$/i, 'No permission to $1.'],
  [/^Tidak ada izin\s+(.+)$/i, 'No permission to $1'],
  [/^Gagal menyimpan\s+(.+)$/i, 'Failed to save $1'],
  [/^Gagal menghapus\s+(.+)$/i, 'Failed to delete $1'],
  [/^Gagal memuat\s+(.+)$/i, 'Failed to load $1'],
  [/^Gagal membuat\s+(.+)$/i, 'Failed to create $1'],
  [/^Gagal mengimport$/i, 'Failed to import'],
  [/^Gagal memproses\s+(.+)$/i, 'Failed to process $1'],
  [/^Menu berhasil disimpan\.$/i, 'Menu saved successfully.'],
]

function withPreservedWhitespace(original: string, translated: string): string {
  const left = original.match(/^\s*/)?.[0] || ''
  const right = original.match(/\s*$/)?.[0] || ''
  return `${left}${translated}${right}`
}

export function translateUiText(value?: string): string {
  if (typeof value !== 'string') return value || ''
  const trimmed = value.trim()
  if (!trimmed) return value

  const direct = DIRECT_TRANSLATIONS[trimmed]
  if (direct) return withPreservedWhitespace(value, direct)

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    if (pattern.test(trimmed)) {
      return withPreservedWhitespace(value, trimmed.replace(pattern, replacement))
    }
  }

  return value
}

function translateTextNode(node: Text) {
  const original = node.nodeValue || ''
  const translated = translateUiText(original)
  if (translated !== original) node.nodeValue = translated
}

function translateElementAttributes(element: Element) {
  const attrNames = ['placeholder', 'title', 'aria-label'] as const
  attrNames.forEach((attr) => {
    const current = element.getAttribute(attr)
    if (!current) return
    const translated = translateUiText(current)
    if (translated !== current) element.setAttribute(attr, translated)
  })
}

function translateUiInElement(root: ParentNode) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT
        const parent = (node as Text).parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  let current = walker.nextNode()
  while (current) {
    translateTextNode(current as Text)
    current = walker.nextNode()
  }

  if (root instanceof Element || root instanceof Document) {
    const elements = (root as ParentNode).querySelectorAll?.('[placeholder],[title],[aria-label]') || []
    elements.forEach((el) => translateElementAttributes(el))
  }
}

declare global {
  interface Window {
    __songketUiTranslatorStarted?: boolean
  }
}

export function startUiTranslationObserver() {
  if (typeof window === 'undefined' || window.__songketUiTranslatorStarted) return
  window.__songketUiTranslatorStarted = true

  const run = () => {
    if (!document.body) return
    translateUiInElement(document.body)
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
        translateTextNode(mutation.target as Text)
        return
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          translateTextNode(node as Text)
          return
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          translateUiInElement(node as ParentNode)
        }
      })
    })
  })

  const start = () => {
    run()
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}
