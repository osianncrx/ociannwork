import { RefObject, useCallback, useEffect } from 'react'

const useClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  enabled: boolean = true,
) => {
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    },
    [ref, callback],
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleClickOutside, enabled])
}

export default useClickOutside
