import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { listMenus, updateMenu } from '../../services/menuService'
import { normalizeIconName } from '../../components/common/AppIcon'
import { useAlert } from '../../components/common/ConfirmDialog'
import { usePermissions } from '../../hooks/usePermissions'
import { resolveErrorMessage } from '../../utils/errorMessage'
import { focusFirstInvalidField } from '../../utils/formFocus'
import MenuDetail from './components/MenuDetail'
import MenuForm from './components/MenuForm'
import MenuList from './components/MenuList'

type MenuItem = {
  id: string
  name?: string
  display_name?: string
  path?: string
  icon?: string
  parent_id?: string
  order_index?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

type MenuForm = {
  name: string
  display_name: string
  path: string
  icon: string
  parent_id: string
  order_index: number
  is_active: boolean
}

const empty: MenuForm = { name: '', display_name: '', path: '', icon: 'menu', parent_id: '', order_index: 0, is_active: true }

function parseMode(pathname: string) {
  if (pathname.endsWith('/edit')) return 'edit'
  if (/\/menus\/[^/]+$/.test(pathname)) return 'detail'
  return 'list'
}

export default function MenusPage() {
  const showAlert = useAlert()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const mode = parseMode(location.pathname)
  const selectedId = params.id || ''
  const isList = mode === 'list'
  const isEdit = mode === 'edit'
  const isDetail = mode === 'detail'

  const { hasPermission } = usePermissions()
  const canList = hasPermission('menus', 'list')
  const canUpdate = hasPermission('menus', 'update')

  const [items, setItems] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalData, setTotalData] = useState(0)

  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stateItem = (location.state as any)?.menu || null

  const load = async () => {
    const res = await listMenus({ page, limit, search: search || undefined })
    const data = res.data.data || res.data || []
    setItems(Array.isArray(data) ? data : [])
    setTotalPages(res.data.total_pages || 1)
    setTotalData(res.data.total_data || 0)
    setPage(res.data.current_page || page)
  }

  useEffect(() => {
    if (canList || isEdit || isDetail) {
      load().catch(() => setItems([]))
    }
  }, [canList, isDetail, isEdit, isList, limit, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((item) => item.id === selectedId) || (stateItem?.id === selectedId ? stateItem : null)
  }, [items, selectedId, stateItem])

  useEffect(() => {
    if (isEdit && selectedItem) {
      setForm({
        name: selectedItem.name || '',
        display_name: selectedItem.display_name || '',
        path: selectedItem.path || '',
        icon: normalizeIconName(selectedItem.icon, selectedItem),
        parent_id: selectedItem.parent_id || '',
        order_index: Number(selectedItem.order_index || 0),
        is_active: Boolean(selectedItem.is_active),
      })
    }
  }, [isEdit, selectedItem])

  const parentOptions = useMemo(() => {
    return items
      .filter((item) => item.id !== selectedId)
      .map((item) => ({
        id: item.id,
        label: item.display_name || item.name || item.path || item.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [items, selectedId])

  const menuById = useMemo(() => {
    const mapped: Record<string, MenuItem> = {}
    items.forEach((item) => {
      mapped[item.id] = item
    })
    return mapped
  }, [items])

  const selectedParentInOptions = useMemo(
    () => parentOptions.some((option) => option.id === form.parent_id),
    [form.parent_id, parentOptions],
  )

  const selectedParentLabel = useMemo(() => {
    if (!form.parent_id) return ''
    const option = parentOptions.find((entry) => entry.id === form.parent_id)
    if (option) return option.label
    const parent = menuById[form.parent_id]
    return parent?.display_name || parent?.name || parent?.path || ''
  }, [form.parent_id, menuById, parentOptions])

  const save = async () => {
    if (!canUpdate) return

    const nextName = String(form.name || '').trim()
    const nextDisplayName = String(form.display_name || '').trim()
    const nextPath = String(form.path || '').trim()

    if (nextName.length < 2) {
      const message = 'Menu name is required and must be at least 2 characters.'
      focusFirstInvalidField('name')
      setError(message)
      await showAlert(message)
      return
    }
    if (nextDisplayName.length < 2) {
      const message = 'Display Name is required and must be at least 2 characters.'
      focusFirstInvalidField('display_name')
      setError(message)
      await showAlert(message)
      return
    }
    if (!nextPath) {
      const message = 'Path is required.'
      focusFirstInvalidField('path')
      setError(message)
      await showAlert(message)
      return
    }

    setLoading(true)
    setError('')

    try {
      const parentId = String(form.parent_id || '').trim()
      const icon = normalizeIconName(form.icon, { path: form.path, icon: form.icon })
      const body = {
        ...form,
        name: nextName,
        display_name: nextDisplayName,
        path: nextPath,
        icon,
        order_index: Number(form.order_index),
        parent_id: parentId || null,
      }
      if (isEdit && selectedId) await updateMenu(selectedId, body)
      if (canList) {
        await load().catch(() => undefined)
      }
      setForm(empty)
      navigate('/menus')
    } catch (err: any) {
      const message = resolveErrorMessage(err, 'Failed to save menu')
      setError(message)
      await showAlert(message)
    } finally {
      setLoading(false)
    }
  }

  const set = (key: keyof typeof empty, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isDetail) {
    const parentMenu = selectedItem?.parent_id ? menuById[selectedItem.parent_id] : null
    const childMenuCount = items.filter((menu) => menu.parent_id && menu.parent_id === selectedItem?.id).length

    return (
      <MenuDetail
        canUpdate={canUpdate}
        childMenuCount={childMenuCount}
        navigate={navigate}
        parentMenu={parentMenu}
        selectedId={selectedId}
        selectedItem={selectedItem}
      />
    )
  }

  if (isEdit) {
    return (
      <MenuForm
        canUpdate={canUpdate}
        error={error}
        form={form}
        loading={loading}
        navigate={navigate}
        parentOptions={parentOptions}
        save={save}
        selectedParentInOptions={selectedParentInOptions}
        selectedParentLabel={selectedParentLabel}
        set={set}
      />
    )
  }

  return (
    <MenuList
      canList={canList}
      canUpdate={canUpdate}
      items={items}
      limit={limit}
      navigate={navigate}
      page={page}
      search={search}
      setLimit={setLimit}
      setPage={setPage}
      setSearch={setSearch}
      totalData={totalData}
      totalPages={totalPages}
    />
  )
}
