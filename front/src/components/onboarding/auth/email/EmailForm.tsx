import { Form, Formik } from 'formik'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../../../../api'
import { STORAGE_KEYS, URL_KEYS } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { TextInput } from '../../../../shared/form-fields'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { emailCheckSuccess } from '../../../../store/slices/authSlice'
import { hideLoader, showLoader } from '../../../../store/slices/loaderSlice'
import { setScreen } from '../../../../store/slices/screenSlice'
import { EmailCheckResponse, EmailFormValues } from '../../../../types'
import { clearStorageExcept, getStorage } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { emailSchema } from '../../../../utils/validation-schemas'

const EmailForm = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading } = useAppSelector((store) => store.loader)
  const storage = getStorage()
  const keepMail = storage.getItem(STORAGE_KEYS.KEEP_MAIL) 
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL)

  useEffect(() => {
    if (keepMail) {
      clearStorageExcept([STORAGE_KEYS.CHECK_EMAIL, STORAGE_KEYS.KEEP_MAIL])
    } else {
      storage.clear()
    }
  }, [keepMail])

  useEffect(() => {
    navigate(`/`, { replace: true })
  }, [])

  const handleEmailCheck = async (values: EmailFormValues) => {
    try {
      dispatch(showLoader())
      const result = await post<EmailFormValues, EmailCheckResponse>(URL_KEYS.Auth.CheckEmail, values)
      dispatch(emailCheckSuccess(values.email))
      dispatch(hideLoader())
      if (result.userExists && result.emailVerified && result.isProfileUpdated) {
        dispatch(setScreen('password'))
      } else {
        dispatch(setScreen('otp'))
      }
      storage.removeItem(STORAGE_KEYS.KEEP_MAIL)
    } catch (error: any) {
      dispatch(hideLoader())
      toaster('error', error?.message || 'email_check_failed')
    }
  }

  return (
    <Formik
      initialValues={{ email: checkEmail || '' }}
      validationSchema={emailSchema}
      onSubmit={handleEmailCheck}
      validateOnBlur={false}
    >
      {() => (
        <Form className="login-form" autoComplete="off">
          <div className="login-input">
            <TextInput
              autoFocus
              layout="vertical"
              formGroupClass="margin-b-30"
              iconProps={{
                iconId: 'massages',
                className: 'form-icon form-mark',
              }}
              label="email_address"
              name="email"
              type="email"
              placeholder="email_placeholder"
            />
          </div>

          <SolidButton
            title="login_or_create_team"
            type="submit"
            color="primary"
            className="w-100 login-btn mb-0"
            loading={loading}
          />
        </Form>
      )}
    </Formik>
  )
}

export default EmailForm
