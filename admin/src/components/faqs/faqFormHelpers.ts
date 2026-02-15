import * as Yup from 'yup'
import { NavigateFunction } from 'react-router-dom'
import { mutations } from '../../api'
import { ROUTES } from '../../constants'
import { CreateFAQPayload, UpdateFAQPayload } from '../../types'
import { toaster } from '../../utils/custom-functions'
import { FormValues, SubmitHandler } from '../../types/components/faqs'

export const validationSchema = Yup.object({
  question: Yup.string()
    .required('Question is required')
    .min(10, 'Question must be at least 10 characters')
    .max(500, 'Question must not exceed 500 characters'),
  answer: Yup.string()
    .required('Answer is required')
    .min(10, 'Answer must be at least 10 characters')
    .max(2000, 'Answer must not exceed 2000 characters'),
  statusSwitch: Yup.boolean(),
})

export const useFaqFormHelpers = () => {
  const { mutate: createFaq } = mutations.useCreateFaq()
  const { mutate: updateFaq } = mutations.useUpdateFaq()

  const handleSubmit: SubmitHandler = (
    values: FormValues,
    isEdit: boolean,
    id: string | undefined,
    navigate: NavigateFunction,
    setSubmitting: (isSubmitting: boolean) => void,
  ) => {
    const payload: CreateFAQPayload = {
      question: values.question,
      answer: values.answer,
      status: values.statusSwitch ? 'active' : 'deactive',
    }

    if (isEdit && id) {
      updateFaq(
        { id: parseInt(id), data: payload as UpdateFAQPayload },
        {
          onSuccess: () => {
            toaster('success', 'FAQ updated successfully')
            navigate(ROUTES.MANAGE_FAQS)
          },
          onError: (error) => {
            console.error('Update error:', error)
            toaster('error', 'Failed to update FAQ')
            setSubmitting(false)
          },
        },
      )
    } else {
      createFaq(payload, {
        onSuccess: () => {
          toaster('success', 'FAQ created successfully')
          navigate(ROUTES.MANAGE_FAQS)
        },
        onError: (error) => {
          console.error('Create error:', error)
          toaster('error', 'Failed to create FAQ')
          setSubmitting(false)
        },
      })
    }
  }

  return {
    handleSubmit,
  }
}
