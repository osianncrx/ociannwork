import { useState } from 'react'

const useToggle = (initialState: string | string[] = []) => {
  const [open, setOpen] = useState<string | string[]>(initialState)

  const toggle = (id: string) => {
    if (Array.isArray(open)) {
      setOpen(open.includes(id) ? open.filter((item) => item !== id) : [...open, id])
    } else {
      setOpen(open === id ? [] : id)
    }
  }

  return { open, toggle }
}
export default useToggle
