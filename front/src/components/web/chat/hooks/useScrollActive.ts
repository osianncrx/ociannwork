import { RefObject, useCallback, useEffect, useState } from 'react'

export const useScrollActive = (containerRef: RefObject<HTMLElement | null>, deps: unknown[] = []) => {
  const [isScrollActive, setIsScrollActive] = useState(false)

  const checkScrollActive = useCallback(() => {
    if (containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current
      setIsScrollActive(scrollHeight > clientHeight)
    }
  }, [containerRef])

  useEffect(() => {
    checkScrollActive()
  }, [checkScrollActive, ...deps])

  useEffect(() => {
    window.addEventListener('resize', checkScrollActive)
    return () => window.removeEventListener('resize', checkScrollActive)
  }, [checkScrollActive])

  return isScrollActive
}

export default useScrollActive
