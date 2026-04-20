import { useEffect, type ReactNode } from 'react'
import { useMap } from 'react-leaflet'

export function ReportDetailTable({
  rows,
  wrapValue = false,
}: {
  rows: Array<{ label: string; value: ReactNode }>
  wrapValue?: boolean
}) {
  return (
    <table className="table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th style={{ width: 200 }}>{row.label}</th>
            <td
              style={wrapValue
                ? {
                    maxWidth: 'none',
                    whiteSpace: 'normal',
                    overflow: 'visible',
                    textOverflow: 'clip',
                    wordBreak: 'break-word',
                  }
                : undefined}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ReportMapFly({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    if (center?.length === 2) {
      map.flyTo(center, zoom, { duration: 0.5 })
    }
  }, [center, map, zoom])

  return null
}
