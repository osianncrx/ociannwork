import { FC, useEffect, useState, useMemo } from 'react'
import { ImageBaseUrl, ImagePath } from '../../constants'
import { ImageProps } from '../../types'

const Image: FC<ImageProps> = ({ src, fallbackSrc, alt, className = '', ...rest }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [hasError, setHasError] = useState<boolean>(false)

  // Function to determine if a URL is absolute
  const isAbsoluteUrl = (url: string): boolean => {
    return /^(https?:|data:|\/\/|blob:)/i.test(url)
  }

  // Function to resolve the image source based on different patterns
  const resolveImageSource = useMemo(() => {
    if (!src) {
      return fallbackSrc || null
    }

    try {
      let sourceString: string

      // Handle different source types
      if (typeof src === 'string') {
        sourceString = src.trim()
        if (sourceString === '') {
          return fallbackSrc || null
        }
      } else if (typeof src === 'object' && src !== null) {
        if (src?.url && typeof src.url === 'string' && src.url.trim() !== '') {
          sourceString = src?.url.trim()
        } else {
          // Return fallback for invalid objects
          return fallbackSrc || null
        }
      } else {
        sourceString = String(src)
        if (sourceString === '') {
          return fallbackSrc || null
        }
      }

      // If it's already an absolute URL, return as-is
      if (isAbsoluteUrl(sourceString)) {
        return sourceString
      }

      if (sourceString.startsWith('/uploads/')) {
        return `${ImageBaseUrl}${sourceString}`
      }

      if (sourceString.startsWith('./')) {
        return `${ImageBaseUrl}/${sourceString.replace('./', '')}`
      }

      if (sourceString.startsWith('/')) {
        return `${ImagePath}${sourceString}`
      }

      if (!sourceString.includes('/') && sourceString.includes('.')) {
        return `${ImageBaseUrl}/${sourceString}`
      }

      return `${ImageBaseUrl}/${sourceString.replace(/^\//, '')}`
    } catch (error) {
      console.error('Error resolving image source:', error)
      return fallbackSrc || null
    }
  }, [src, fallbackSrc])

  // Update image source when resolvedSrc changes
  useEffect(() => {
    if (resolveImageSource) {
      setHasError(false)
      setImgSrc(resolveImageSource)
    } else if (fallbackSrc) {
      setImgSrc(fallbackSrc)
    } else {
      // If no valid source and no fallback, set to null
      setImgSrc(null)
    }
  }, [resolveImageSource, fallbackSrc])

  const handleError = () => {
    if (fallbackSrc && !hasError) {
      setHasError(true)
      setImgSrc(fallbackSrc)
    } else if (!hasError) {
      setHasError(true)
      setImgSrc(null)
    }
  }

  // Don't render the img element at all if there's no valid source
  if (imgSrc === null) {
    return (
      <div className={`image-placeholder ${className}`}>
        <span>No Image</span>
      </div>
    )
  }

  return <img src={imgSrc} alt={alt} onError={handleError} className={className} {...rest} />
}

export default Image
