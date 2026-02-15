import { useAppSelector } from '../../../store/hooks'
import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState, ReactNode } from 'react'

const PageLoader = ({ children }: { children: ReactNode }) => {
  const { pageLoading } = useAppSelector((state) => state.loader)
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  const [showLoader, setShowLoader] = useState(false)
  const isApiLoading = pageLoading && Object.values(pageLoading).some(Boolean)

  useEffect(() => {
    if (previousPath.current !== location.pathname && isApiLoading) {
      setShowLoader(true)
    } else {
      setShowLoader(false)
    }

    previousPath.current = location.pathname
  }, [location.pathname, isApiLoading])

  return (
    <>
      {showLoader && (
        <div className="custom-loader">
          <span className="loader"></span>
          <h4 className="loader-text">Loading...</h4>
        </div>
      )}

      {(!showLoader || !isApiLoading) && children}
    </>
  )
}

export default PageLoader
