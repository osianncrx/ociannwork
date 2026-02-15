import { useEffect } from 'react'
import { DynamicMetaOptions } from '../../types'

export const useDynamicMeta = ({ title, description, keywords }: DynamicMetaOptions) => {
  useEffect(() => {
    if (title) {
      document.title = title
    }
    if (description) {
      let metaDesc = document.querySelector("meta[name='description']")
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.setAttribute('name', 'description')
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute('content', description)
    }
    if (keywords) {
      let metaKeywords = document.querySelector("meta[name='keywords']")
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta')
        metaKeywords.setAttribute('name', 'keywords')
        document.head.appendChild(metaKeywords)
      }
      metaKeywords.setAttribute('content', keywords)
    }
  }, [title, description, keywords])
}
