import { ReactNode } from 'react'

interface Column {
  key: string
  label?: string
  header?: string
  render?: (row: any) => ReactNode
  style?: React.CSSProperties
}

interface AttendanceTableProps {
  columns: Column[]
  data: any[]
  emptyMessage?: string
  loading?: boolean
  keyExtractor?: (row: any) => string | number
}

export default function AttendanceTable({
  columns, data, emptyMessage = 'No hay datos', loading = false, keyExtractor,
}: AttendanceTableProps) {
  if (loading) {
    return <p style={{ color: '#94a3b8', padding: '1rem' }}>Cargando...</p>
  }

  if (data.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '0.5rem' }}>{emptyMessage}</p>
  }

  return (
    <table className="att-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={col.style}>{col.label || col.header || ''}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={keyExtractor ? keyExtractor(row) : (row.id || row.idMarca || i)}>
            {columns.map(col => (
              <td key={col.key} style={col.style}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
