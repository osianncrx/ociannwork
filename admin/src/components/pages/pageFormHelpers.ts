import * as Yup from 'yup'
import { FormikHelpers } from 'formik'
import { mutations } from '../../api'
import { ROUTES } from '../../constants'
import { CreatePagePayload, UpdatePagePayload } from '../../types'
import { toaster } from '../../utils/custom-functions'
import { FormValues, SelectOption, SubmitHandler } from '../../types/components/pages'
import { NavigateFunction } from 'react-router-dom'

export const typeOptions: SelectOption[] = [
  { label: 'Terms', value: 'terms' },
  { label: 'Privacy Policy', value: 'privacy-policy' },
  { label: 'Other', value: 'other' },
]

export const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  slug: Yup.string()
    .required('Slug is required')
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must not exceed 100 characters')
    .matches(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  content: Yup.string().required('Content is required').min(10, 'Content must be at least 10 characters'),
  status: Yup.string().oneOf(['active', 'deactive'], 'Invalid status'),
})

export const usePageFormHelpers = () => {
  const { mutate: createPage } = mutations.useCreatePage()
  const { mutate: updatePage } = mutations.useUpdatePage()

  const handleSubmit: SubmitHandler = (
    values: FormValues,
    isEdit: boolean,
    id: string | undefined,
    navigate: NavigateFunction,
    { setSubmitting }: FormikHelpers<FormValues>,
  ) => {
    const payload: CreatePagePayload = {
      title: values.title,
      slug: values.slug,
      content: values.content,
      status: values.status,
      created_by: values.created_by,
    }

    if (isEdit && id) {
      updatePage(
        { id: parseInt(id), data: payload as UpdatePagePayload },
        {
          onSuccess: () => {
            toaster('success', 'Page updated successfully')
            navigate(ROUTES.MANAGE_PAGES)
          },
          onError: (error) => {
            console.error('Update error:', error)
            toaster('error', 'Failed to update page')
            setSubmitting(false)
          },
        },
      )
    } else {
      createPage(payload, {
        onSuccess: () => {
          toaster('success', 'Page created successfully')
          navigate(ROUTES.MANAGE_PAGES)
        },
        onError: (error) => {
          console.error('Create error:', error)
          toaster('error', 'Failed to create page')
          setSubmitting(false)
        },
      })
    }
  }

  return {
    handleSubmit,
  }
}
