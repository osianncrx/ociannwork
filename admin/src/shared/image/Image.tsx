import { FC, useEffect, useState, useCallback } from 'react'
import { ImagePath } from '../../constants'
import { ImageProps } from '../../types'

const DEFAULT_BASE_URL = import.meta.env.VITE_STORAGE_URL || ''

type FileOrBlob = File | Blob

interface FileObject {
  preview?: FileOrBlob
  file?: FileOrBlob
}

const Image: FC<ImageProps> = ({ src, baseUrl = DEFAULT_BASE_URL, fallbackSrc, alt = '', ...rest }) => {
  const isFileOrBlob = (val: unknown): val is FileOrBlob => val instanceof File || val instanceof Blob

  const getResolvedSrc = useCallback(
    (source: string | FileOrBlob | FileObject | null | undefined): string => {
      if (!source) return ''

      if (typeof source === 'object') {
        if (isFileOrBlob(source)) {
          return URL.createObjectURL(source)
        }

        const fileObj = source as FileObject
        if (fileObj.preview && isFileOrBlob(fileObj.preview)) {
          return URL.createObjectURL(fileObj.preview)
        }

        if (fileObj.file && isFileOrBlob(fileObj.file)) {
          return URL.createObjectURL(fileObj.file)
        }
      }

      if (typeof source === 'string') {
        const normalizedSrc = source.trim()

        if (
          normalizedSrc.startsWith('http') ||
          normalizedSrc.startsWith('data:') ||
          normalizedSrc.startsWith('blob:') ||
          normalizedSrc.startsWith('//')
        ) {
          return normalizedSrc
        }

        if (normalizedSrc.startsWith('/uploads')) {
          return `${baseUrl}${normalizedSrc}`
        }

        if (normalizedSrc.startsWith('/')) {
          return `${ImagePath}${normalizedSrc}`
        }

        return `${baseUrl}/${normalizedSrc.replace(/^\//, '')}`
      }

      return ''
    },
    [baseUrl],
  )

  const [imgSrc, setImgSrc] = useState<string>(() => getResolvedSrc(src))

  useEffect(() => {
    const resolved = getResolvedSrc(src)
    setImgSrc(resolved)

    return () => {
      if (typeof src === 'object' && src !== null) {
        const fileObj = src as FileObject
        if (
          isFileOrBlob(src) ||
          (fileObj.preview && isFileOrBlob(fileObj.preview)) ||
          (fileObj.file && isFileOrBlob(fileObj.file))
        ) {
          URL.revokeObjectURL(resolved)
        }
      }
    }
  }, [src, getResolvedSrc])

  const handleError = () => {
    if (fallbackSrc) {
      setImgSrc(fallbackSrc)
    }
  }

  return <img src={imgSrc} alt={alt} onError={handleError} {...rest} />
}

export default Image
