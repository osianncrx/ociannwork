import * as Yup from 'yup'

export const yupObject = <T extends Record<string, Yup.AnySchema>>(schemaObject: T) => {
  return Yup.object().shape(schemaObject)
}

export const dynamicNameSchema = (fieldLabel: string = 'Field') => Yup.string().required(`${fieldLabel} is required`)

export const loginSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
})

export const emailSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email address (e.g., example@domain.com)',
    ),
})

export const mailSchema = Yup.string()
  .email('Invalid email address')
  .required('Email is required')

  export const strictMailSchema = Yup.string()
    .email('Invalid email address')
    .required('Email is required')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email address (e.g., example@domain.com)',
    )

export const passwordSchema = Yup.string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')

export const verifyPasswordSchema = Yup.string()
  .required('Confirm Password is required')
  .oneOf([Yup.ref('password')], "Password doesn't  match")

export const otpSchema = Yup.object().shape({
  otp: Yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
})

export const confirmPasswordSchema = Yup.object().shape({
  password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('password'), undefined], "Password doesn't match")
    .required('Confirm Password is required'),
})

export const nameSchema = (fieldLabel: string = 'Field') => Yup.string().required(`${fieldLabel} is required`)

export const phoneSchema = Yup.string().min(6).max(15).required('Phone number is required ')

export const emailValidation = Yup.string().email('Invalid email address').required('Email is required')

export const updatePasswordSchema = Yup.object({
  old_password: Yup.string().required('Old password is required'),
  new_password: Yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters')
    .notOneOf([Yup.ref('old_password')], 'New password must be different from old password'),
  confirm_password: Yup.string()
    .required('Confirm password is required')
    .oneOf([Yup.ref('new_password')], 'Passwords must match'),
})
