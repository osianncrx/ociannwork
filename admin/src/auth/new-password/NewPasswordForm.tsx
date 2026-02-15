import { Form, Formik } from 'formik'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../api'
import { ROUTES, STORAGE_KEYS } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import { TextInput } from '../../shared/form-fields'
import { useAppDispatch } from '../../store/hooks'
import { clearForgotPasswordEmail } from '../../store/slices/authSlice'
import { ResetPasswordFormValues } from '../../types'
import { getStorage } from '../../utils'
import { toaster } from '../../utils/custom-functions'
import { confirmPasswordSchema } from '../../utils/validation-schemas'

const NewPasswordForm = () => {
  const storage = getStorage()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const { mutate: resetPassword, isPending } = mutations.useResetPassword()

  const handleSubmit = (values: ResetPasswordFormValues) => {
    const email = storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL)
    const otp = storage.getItem(STORAGE_KEYS.OTP_TOKEN)
    if (!otp || !email) {
      toaster('error', 'Invalid OTP or email. Please try again.')
      return
    }
    resetPassword(
      {
        otp: otp,
        new_password: values.password,
        email: email,
      },
      {
        onSuccess: () => {
          toaster('success', 'Password reset successfully. You can now login.')
          dispatch(clearForgotPasswordEmail())
          navigate(ROUTES.LOGIN)
        },
      },
    )
  }
  return (
    <Formik
      initialValues={{
        password: '',
        confirm_password: '',
      }}
      validationSchema={confirmPasswordSchema}
      onSubmit={handleSubmit}
    >
      {() => (
        <Form className="login-form">
          <TextInput
            label="new_password"
            iconProps={{ iconId: 'lock', className: 'form-icon' }}
            name="password"
            placeholder="*********"
            type="password"
          />
          <TextInput
            label="confirm_password"
            iconProps={{ iconId: 'lock', className: 'form-icon' }}
            name="confirm_password"
            placeholder="*********"
            type="password"
          />
          <div className="forgot-pass auth-navigation">
            <Link to={ROUTES.LOGIN} className="small forgot-link">
              {t('back_to_login')}
            </Link>
            <Link to={ROUTES.FORGOT_PASSWORD} className="small forgot-link">
              {t('back_to_forgot_password')}
            </Link>
          </div>
          <SolidButton title="submit" type="submit" color="primary" className=" w-100 Login-btn" loading={isPending} />
        </Form>
      )}
    </Formik>
  )
}

export default NewPasswordForm
