import { FormikHelpers } from 'formik'
import { NavigateFunction } from 'react-router-dom'
import { CreatePagePayload } from '../../types'

export type FormValues = CreatePagePayload

export interface SelectOption {
  label: string
  value: string | number
}

export type SubmitHandler = (
  values: FormValues,
  isEdit: boolean,
  id: string | undefined,
  navigate: NavigateFunction,
  helpers: FormikHelpers<FormValues>,
) => void
