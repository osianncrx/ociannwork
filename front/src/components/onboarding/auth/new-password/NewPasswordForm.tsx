import { Form, Formik } from 'formik'
import { useState } from 'react'
import { mutations } from '../../../../api'
import { STORAGE_KEYS } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { TextInput } from '../../../../shared/form-fields'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { clearForgotPasswordEmail } from '../../../../store/slices/authSlice'
import { setScreen } from '../../../../store/slices/screenSlice'
import { ResetPasswordFormValues } from '../../../../types'
import { getStorage } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { confirmPasswordSchema } from '../../../../utils/validation-schemas'

const NewPasswordForm = () => {
  const storage = getStorage()
  const dispatch = useAppDispatch()
  const { mutate: resetPassword, isPending } = mutations.useResetPassword()
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm_password: false,
  })
  const handleShowPassword = (field: keyof typeof showPassword) => {
    setShowPassword({ ...showPassword, [field]: !showPassword[field] })
  }

  const handleSubmit = (values: ResetPasswordFormValues) => {
    const email = storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL) || ''
    const otp = storage.getItem(STORAGE_KEYS.OTP)

    if (!otp || !email) {
      toaster('error', 'invalid_otp_or_email_please_try_again')
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
          dispatch(clearForgotPasswordEmail())
          dispatch(setScreen('email'))
          storage.setItem(STORAGE_KEYS.CHECK_EMAIL, email)
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
      validateOnBlur={true}
    >
      {() => (
        <Form className="login-form ">
          <div className="margin-b-19">
            <TextInput
              autoFocus
              layout="vertical"
              label="password"
              iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
              name="password"
              type={showPassword.password ? 'text' : 'password'}
              placeholder="**********"
              children={
                <div className="password-wrap password-box " onClick={() => handleShowPassword('password')}>
                  {showPassword.password ? (
                    <SvgIcon className="icon-eye" iconId="show-eye" />
                  ) : (
                    <SvgIcon className="icon-eye" iconId="hide-eye" />
                  )}
                </div>
              }
            />
          </div>
          <div className="margin-b-30">
            <TextInput
              layout="vertical"
              label="confirm_password"
              iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
              name="confirm_password"
              type={showPassword.confirm_password ? 'text' : 'password'}
              placeholder="**********"
              children={
                <div className="password-wrap password-box" onClick={() => handleShowPassword('confirm_password')}>
                  {showPassword.confirm_password ? (
                    <SvgIcon className="icon-eye" iconId="show-eye" />
                  ) : (
                    <SvgIcon className="icon-eye" iconId="hide-eye" />
                  )}
                </div>
              }
            />
          </div>
          <SolidButton loading={isPending} type="submit" color="primary" title="Submit" className=" w-100 login-btn" />
        </Form>
      )}
    </Formik>
  )
}

export default NewPasswordForm
