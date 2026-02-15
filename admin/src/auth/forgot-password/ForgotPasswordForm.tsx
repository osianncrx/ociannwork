import { Form, Formik, FormikHelpers } from 'formik'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../api'
import { ROUTES } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import { TextInput } from '../../shared/form-fields'
import { useAppDispatch } from '../../store/hooks'
import { setForgotPasswordEmail } from '../../store/slices/authSlice'
import { toaster } from '../../utils/custom-functions'
import { emailSchema } from '../../utils/validation-schemas'
import { EmailPayload } from '../../types'

const ForgotPasswordForm = () => {
  const { mutate: requestPin, isPending } = mutations.useRequestForgotPassword()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  
  const handleSubmit = async (values: EmailPayload, { resetForm }: FormikHelpers<EmailPayload>) => {
    requestPin(
      { email: values?.email },
      {
        onSuccess: () => {
          dispatch(setForgotPasswordEmail(values.email))
          toaster('success', 'Otp sent successfully')
          navigate(ROUTES.VERIFY_OTP)
          resetForm()
        },
      },
    )
  }

  return (
    <Formik
      initialValues={{
        email: '',
      }}
      validationSchema={emailSchema}
      onSubmit={handleSubmit}
    >
      {() => (
        <Form className="login-form">
          <TextInput
            label="email_address"
            containerClass="login-input email-input"
            iconProps={{ iconId: 'messages', className: 'form-icon' }}
            name="email"
            type="email"
            placeholder="rarex49098@firain.com"
          />
          <div className="forgot-pass mb-4">
            <Link to={ROUTES.LOGIN} className="small forgot-link">
              {t('back_to_login')}
            </Link>
          </div>
          <SolidButton loading={isPending} title="send" type="submit" color="primary" className="w-100 Login-btn" />
        </Form>
      )}
    </Formik>
  )
}
export default ForgotPasswordForm
