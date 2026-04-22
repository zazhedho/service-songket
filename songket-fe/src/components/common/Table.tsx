import type { CSSProperties, ReactNode } from 'react'
import { getClickableTableRowProps } from './tableRowLink'

export type TableColumn<T> = {
  header: ReactNode
  accessor: keyof T | ((item: T, index: number) => ReactNode)
  className?: string
  headerClassName?: string
  cellClassName?: string | ((item: T, index: number) => string | undefined)
  style?: CSSProperties | ((item: T, index: number) => CSSProperties | undefined)
  headerStyle?: CSSProperties
  ignoreRowClick?: boolean
}

type TableProps<T> = {
  className?: string
  columns: TableColumn<T>[]
  data: T[]
  emptyMessage?: string
  emptyState?: ReactNode
  isLoading?: boolean
  keyField: keyof T | ((item: T, index: number) => string | number)
  loadingMessage?: string
  onRowClick?: (item: T, index: number) => void
  rowAriaLabel?: (item: T, index: number) => string | undefined
  rowClassName?: string | ((item: T, index: number) => string | undefined)
  rowStyle?: CSSProperties | ((item: T, index: number) => CSSProperties | undefined)
  style?: CSSProperties
}

function readCellValue<T>(column: TableColumn<T>, item: T, index: number) {
  if (typeof column.accessor === 'function') {
    return column.accessor(item, index)
  }
  return item[column.accessor] as ReactNode
}

function readKey<T>(keyField: TableProps<T>['keyField'], item: T, index: number) {
  if (typeof keyField === 'function') return keyField(item, index)
  return item[keyField] as string | number
}

function readMaybeValue<T, TValue>(
  value: TValue | ((item: T, index: number) => TValue),
  item: T,
  index: number,
): TValue {
  if (typeof value === 'function') {
    return (value as (item: T, index: number) => TValue)(item, index)
  }
  return value
}

export default function Table<T>({
  className,
  columns,
  data,
  emptyMessage = 'No data available.',
  emptyState,
  isLoading,
  keyField,
  loadingMessage = 'Loading...',
  onRowClick,
  rowAriaLabel,
  rowClassName,
  rowStyle,
  style,
}: TableProps<T>) {
  const mergedClassName = ['table', className].filter(Boolean).join(' ')

  return (
    <table className={mergedClassName} style={style}>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th
              key={`header-${index}`}
              className={column.headerClassName}
              style={column.headerStyle}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading && (
          <tr>
            <td colSpan={columns.length}>{loadingMessage}</td>
          </tr>
        )}

        {!isLoading && data.length === 0 && (
          emptyState || (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )
        )}

        {!isLoading && data.map((item, rowIndex) => {
          const rowProps = onRowClick
            ? getClickableTableRowProps(() => onRowClick(item, rowIndex), {
                ariaLabel: rowAriaLabel?.(item, rowIndex),
                className: typeof rowClassName === 'function' ? rowClassName(item, rowIndex) : rowClassName,
              })
            : {
                className: typeof rowClassName === 'function' ? rowClassName(item, rowIndex) : rowClassName,
              }

          const computedRowStyle = rowStyle
            ? readMaybeValue(rowStyle, item, rowIndex)
            : undefined

          return (
            <tr
              key={String(readKey(keyField, item, rowIndex))}
              {...rowProps}
              style={computedRowStyle}
            >
              {columns.map((column, colIndex) => {
                const computedCellClassName = column.cellClassName
                  ? readMaybeValue(column.cellClassName, item, rowIndex)
                  : undefined
                const computedStyle = column.style
                  ? readMaybeValue(column.style, item, rowIndex)
                  : undefined
                const cellClassName = [column.className, computedCellClassName].filter(Boolean).join(' ')

                return (
                  <td
                    key={`cell-${colIndex}`}
                    className={cellClassName || undefined}
                    style={computedStyle}
                    data-row-click-ignore={column.ignoreRowClick ? 'true' : undefined}
                  >
                    {readCellValue(column, item, rowIndex)}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
