import * as Yup from 'yup'
import { NavigateFunction } from 'react-router-dom'
import { mutations } from '../../api'
import { FEATURES, ROUTES } from '../../constants'
import { CreatePlanPayload, UpdatePlanPayload } from '../../types'
import { toaster } from '../../utils/custom-functions'
import { PlanFormValues, PlanSubmitHandler } from '../../types/components/plans'

export const validationSchema = Yup.object({
  name: Yup.string()
    .required('Plan name is required')
    .min(3, 'Plan name must be at least 3 characters')
    .max(100, 'Plan name must not exceed 100 characters'),
  slug: Yup.string()
    .required('Slug is required')
    .matches(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must not exceed 100 characters'),
  description: Yup.string().max(2000, 'Description must not exceed 2000 characters'),
  price_per_user_per_month: Yup.number()
    .required('Monthly price is required')
    .min(0, 'Price must be greater than or equal to 0')
    .typeError('Price must be a valid number'),
  price_per_user_per_year: Yup.number()
    .required('Yearly price is required')
    .min(0, 'Price must be greater than or equal to 0')
    .typeError('Price must be a valid number'),
  billing_cycle: Yup.string()
    .oneOf(['monthly', 'yearly', 'both'], 'Invalid billing cycle')
    .required('Billing cycle is required'),
  max_channels: Yup.number()
    .required('Max channels is required')
    .min(1, 'Max channels must be at least 1')
    .integer('Max channels must be an integer')
    .typeError('Max channels must be a valid number'),
  max_storage_mb: Yup.number()
    .nullable()
    .min(0, 'Max storage per team must be greater than or equal to 0')
    .integer('Max storage per team must be an integer')
    .typeError('Max storage per team must be a valid number'),
  max_message_search_limit: Yup.number()
    .required('Message search limit is required')
    .min(0, 'Message search limit must be greater than or equal to 0')
    .integer('Message search limit must be an integer')
    .typeError('Message search limit must be a valid number'),
  allows_private_channels: Yup.boolean(),
  allows_file_sharing: Yup.boolean(),
  allows_video_calls: Yup.boolean(),
  allows_multiple_delete: Yup.boolean(),
  display_order: Yup.number()
    .min(0, 'Display order must be greater than or equal to 0')
    .integer('Display order must be an integer')
    .typeError('Display order must be a valid number'),
  is_default: Yup.boolean(),
  statusSwitch: Yup.boolean(),
})

export const usePlanFormHelpers = () => {
  const { mutate: createPlan } = mutations.useCreatePlan()
  const { mutate: updatePlan } = mutations.useUpdatePlan()

  const handleSubmit: PlanSubmitHandler = (
    values: PlanFormValues,
    isEdit: boolean,
    id: string | undefined,
    navigate: NavigateFunction,
    setSubmitting: (isSubmitting: boolean) => void,
  ) => {
    const isFreeVersion = !FEATURES.EXTENDED_VERSION

    // For free version: ensure prices are 0 and name has (free) label
    let planName = values.name
    if (isFreeVersion) {
      // Ensure name ends with (free)
      if (!planName.toLowerCase().includes('(free)')) {
        planName = `${planName.replace(/\s*\(free\)\s*$/i, '').trim()} (free)`
      }
    }

    const payload: CreatePlanPayload = {
      name: planName,
      slug: values.slug,
      description: values.description || null,
      // Force prices to 0 for free version
      price_per_user_per_month: isFreeVersion ? 0 : Number(values.price_per_user_per_month),
      price_per_user_per_year: isFreeVersion
        ? null
        : values.price_per_user_per_year
          ? Number(values.price_per_user_per_year)
          : null,
      billing_cycle: values.billing_cycle,
      max_channels: Number(values.max_channels),
      max_storage_mb: (() => {
        const value = values.max_storage_mb
        // Handle null, undefined, or empty string
        if (value === null || value === undefined || value === '') {
          return null
        }
        // Convert to number, handling string numbers
        const numValue = Number(value)
        // Return null if conversion results in NaN, otherwise return the number
        return isNaN(numValue) ? null : numValue
      })(),
      max_message_search_limit: Number(values.max_message_search_limit),
      allows_private_channels: values.allows_private_channels,
      allows_file_sharing: values.allows_file_sharing,
      allows_video_calls: values.allows_video_calls,
      allows_multiple_delete: values.allows_multiple_delete,
      display_order: Number(values.display_order) || 0,
      is_default: values.is_default,
      status: values.statusSwitch ? 'active' : 'inactive',
    }

    if (isEdit && id) {
      updatePlan(
        { id: parseInt(id), data: payload as UpdatePlanPayload },
        {
          onSuccess: () => {
            toaster('success', 'Plan updated successfully')
            navigate(ROUTES.PLANS)
          },
          onError: (error) => {
            console.error('Update error:', error)
            toaster('error', 'Failed to update plan')
            setSubmitting(false)
          },
        },
      )
    } else {
      createPlan(payload, {
        onSuccess: () => {
          toaster('success', 'Plan created successfully')
          navigate(ROUTES.PLANS)
        },
        onError: (error) => {
          console.error('Create error:', error)
          toaster('error', 'Failed to create plan')
          setSubmitting(false)
        },
      })
    }
  }

  return {
    handleSubmit,
  }
}
