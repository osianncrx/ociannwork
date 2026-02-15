import { useEffect } from 'react'

export const useDynamicFavicon = (faviconUrl?: string) => {
  useEffect(() => {
    if (faviconUrl) {
      console.log('Setting favicon:', faviconUrl)

      const existingFavicons = document.querySelectorAll("link[rel*='icon']")
      existingFavicons.forEach((link) => link.remove())

      const getImageType = (url: string) => {
        const lowerUrl = url.toLowerCase()
        if (lowerUrl.includes('.png')) return 'image/png'
        if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'image/jpeg'
        if (lowerUrl.includes('.svg')) return 'image/svg+xml'
        if (lowerUrl.includes('.gif')) return 'image/gif'
        if (lowerUrl.includes('.webp')) return 'image/webp'
        if (lowerUrl.includes('.ico')) return 'image/x-icon'
        return 'image/png'
      }

      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = getImageType(faviconUrl)
      link.href = `${faviconUrl}?v=${Date.now()}`

      document.head.appendChild(link)

      console.log('Favicon applied successfully')
    }
  }, [faviconUrl])
}
