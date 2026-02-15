import { toast } from 'react-toastify'
import { ToastType } from '../../types'

export const toaster = (type: ToastType, message: string): void => {
  switch (type) {
    case 'success':
      toast.success(message)
      break
    case 'error':
      toast.error(message)
      break
    case 'warn':
      toast.warn(message)
      break
    case 'info':
      toast.info(message)
      break
    default:
      toast(message)
  }
}
