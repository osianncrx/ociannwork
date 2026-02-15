import { useEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import { FEATURES } from '../../constants'
import { PlanFormValues } from '../../types/components/plans'

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface SlugGeneratorProps {
  isEdit: boolean
}

const SlugGenerator = ({ isEdit }: SlugGeneratorProps) => {
  const { values, setFieldValue } = useFormikContext<PlanFormValues>()
  const prevNameRef = useRef(values.name)
  const isFreeVersion = !FEATURES.EXTENDED_VERSION

  useEffect(() => {
    if (!isEdit && values.name && values.name !== prevNameRef.current) {
      // Remove "(free)" if it exists before generating slug
      const nameWithoutFree = values.name.replace(/\s*\(free\)\s*$/i, '').trim()
      const slug = generateSlug(nameWithoutFree)
      if (slug) {
        setFieldValue('slug', slug)
      }
      prevNameRef.current = values.name
    }
  }, [values.name, isEdit, setFieldValue])

  // Handle free version: force prices to 0 (but don't modify name during typing)
  useEffect(() => {
    if (isFreeVersion) {
      // Force prices to 0
      if (values.price_per_user_per_month !== 0 && values.price_per_user_per_month !== '0') {
        setFieldValue('price_per_user_per_month', 0)
      }
      if (values.price_per_user_per_year !== 0 && values.price_per_user_per_year !== '' && values.price_per_user_per_year !== '0') {
        setFieldValue('price_per_user_per_year', '')
      }
    }
  }, [isFreeVersion, values.price_per_user_per_month, values.price_per_user_per_year, setFieldValue])

  return null
}

export default SlugGenerator

