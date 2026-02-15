import { Form, Formik } from 'formik'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { post } from '../../api'
import { ROUTES, URL_KEYS } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import { TextInput } from '../../shared/form-fields'
import { useAppDispatch } from '../../store/hooks'
import { loginSuccess } from '../../store/slices/authSlice'
import { LoginPayload } from '../../types'
import { getParam } from '../../utils'
import { toaster } from '../../utils/custom-functions'
import { loginSchema } from '../../utils/validation-schemas'

const LoginForm = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const returnUrl = getParam('returnUrl')
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: LoginPayload) => {
    try {
      setLoading(true)
      const result = await post(URL_KEYS.Auth.Login, values)
      dispatch(loginSuccess(result))
      setLoading(false)
      navigate(returnUrl ? returnUrl : ROUTES.DASHBOARD)
    } catch {
      setLoading(false)
      toaster('error', 'Invalid credentials')
    }
  }

  return (
    <Formik
      initialValues={{
        email: '',
        password: '',
      }}
      validationSchema={loginSchema}
      onSubmit={handleSubmit}
    >
      {() => (
        <Form className="login-form">
          <TextInput
            label="email_address"
            iconProps={{ iconId: 'messages', className: 'form-icon' }}
            name="email"
            type="email"
            placeholder="rarex49098@firain.com"
          />
          <TextInput
            iconProps={{ iconId: 'lock', className: 'form-icon' }}
            name="password"
            label="password"
            type="password"
            placeholder="*********"
          />
          <div className="forgot-pass">
            <Link to={ROUTES.FORGOT_PASSWORD} className="small forgot-link">
              {t('forgot_password')}
            </Link>
          </div>
          <SolidButton title="Login" type="submit" color="primary" className="w-100 Login-btn" loading={loading} />
        </Form>
      )}
    </Formik>
  )
}
export default LoginForm
