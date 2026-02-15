import { FormEvent, ReactNode } from 'react'

export interface DeleteModalPros {
  isOpen: boolean
  toggle: () => void
  onConfirm: () => void
  itemName?: string
  isLoading?: boolean
}

export interface ModalFormWrapperProps {
  isOpen: boolean
  toggle: () => void
  title?: string
  iconId?: string
  onSubmit?: (e: FormEvent) => void
  isLoading?: boolean
  submitLabel?: string
  cancelLabel?: string
  children: ReactNode
  disableFooter?: boolean
}
