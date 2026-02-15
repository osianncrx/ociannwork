export type ToastType = 'success' | 'error' | 'warn' | 'info' | 'default'

export interface FormatOptions  {
  showDate?: boolean
  showTime?: boolean
  locale?: string
  statusSwitch?:any
}

export interface RowData {
  id: string | number
  [key: string]: unknown
}

export interface TableChildProps {
  setSelectedRowsCount?: (count: number) => void
  onSelectionChange?: (data: RowData[]) => void
}

export interface DynamicMetaOptions {
  title?: string
  description?: string
  keywords?: string
}

export interface UseImagePreviewReturn {
    previewUrl: string | null
    handleFileSelect: (file: File) => void
    clearPreview: () => void
    setPreviewUrl: (url: string | null) => void
}