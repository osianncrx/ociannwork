import { NavigateFunction } from 'react-router-dom'

export interface FormValues {
  question: string
  answer: string
  statusSwitch: boolean
}

export type SubmitHandler = (
  values: FormValues,
  isEdit: boolean,
  id: string | undefined,
  navigate: NavigateFunction,
  setSubmitting: (isSubmitting: boolean) => void,
) => void
