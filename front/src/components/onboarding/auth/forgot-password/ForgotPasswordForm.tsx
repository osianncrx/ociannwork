import { Form, Formik, FormikHelpers } from 'formik'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button'
import { TextInput } from '../../../../shared/form-fields'
import { useAppDispatch } from '../../../../store/hooks'
import { setForgotPasswordEmail } from '../../../../store/slices/authSlice'
import { setScreen } from '../../../../store/slices/screenSlice'
import { EmailPayload } from '../../../../types'
import { emailSchema } from '../../../../utils/validation-schemas'
import { getStorage } from '../../../../utils'
import { STORAGE_KEYS } from '../../../../constants'

const ForgotPasswordForm = () => {
  const dispatch = useAppDispatch()
  const { mutate: requestPin, isPending } = mutations.useRequestForgotPassword()
  const storage = getStorage()
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL)

  const handleSubmit = async (values: EmailPayload, { resetForm }: FormikHelpers<EmailPayload>) => {
    requestPin(
      { email: values.email },
      {
        onSuccess: () => {
          dispatch(setForgotPasswordEmail(values.email))
          dispatch(setScreen('otp'))
          resetForm()
        },
      },
    )
  }

  return (
    <Formik
      initialValues={{ email: checkEmail || '' }}
      validationSchema={emailSchema}
      onSubmit={handleSubmit}
      validateOnBlur={false}
    >
      {() => (
        <Form className="login-form">
          <TextInput
            layout="vertical"
            label="email_address"
            containerClass="login-input margin-b-30"
            iconProps={{ iconId: 'massages', className: 'form-icon form-mark' }}
            name="email"
            type="email"
            placeholder="Enter your email"
          />
          <SolidButton
            loading={isPending}
            title="send"
            type="submit"
            color="primary"
            className="w-100 login-btn mt-3"
          />
        </Form>
      )}
    </Formik>
  )
}

export default ForgotPasswordForm
