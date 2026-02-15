import { useState } from 'react'

const useDeleteConfirmation = <T extends { name?: string }>() => {
  const [isOpen, setIsOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<T | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const show = (item: T) => {
    setItemToDelete(item)
    setIsOpen(true)
  }

  const hide = () => {
    setIsOpen(false)
    setItemToDelete(null)
  }

  return {
    isOpen,
    itemToDelete,
    isDeleting,
    show,
    hide,
    setIsDeleting,
  }
}

export default useDeleteConfirmation
