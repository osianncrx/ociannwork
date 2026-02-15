import { Form, Formik, FormikHelpers } from 'formik'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { mutations } from '../../api'
import { ROUTES, STORAGE_KEYS } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import { OTPInput } from '../../shared/form-fields'
import { OtpPayload } from '../../types'
import { getStorage } from '../../utils'
import { toaster } from '../../utils/custom-functions'
import { otpSchema } from '../../utils/validation-schemas'

const VerifyOtpForm = () => {
  const coolDownSeconds = 60
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''))
  const [resendDisabled, setResendDisabled] = useState(false)
  const [coolDown, setCoolDown] = useState(0)
  const storage = getStorage()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const forgotPasswordEmail = storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL) || null
  const { mutate: verifyOtp, isPending } = mutations.useVerifyOtp()
  const { mutate: resendOtp, isPending: resendOtpLoading } = mutations.useResendOtp()

  const handleSubmit = async (values: OtpPayload,_formikHelpers: FormikHelpers<OtpPayload>) => {
    if (!forgotPasswordEmail) {
      toaster('error', 'Email not found. Please restart the password reset process.')
      navigate(ROUTES.FORGOT_PASSWORD)
      return
    }
    verifyOtp(
      {
        email: forgotPasswordEmail,
        otp: values.otp,
      },
      {
        onSuccess: () => {
          storage.setItem(STORAGE_KEYS.OTP_TOKEN, values.otp)
          navigate(ROUTES.SET_NEW_PASSWORD)
          toaster('success', 'Otp verified successfully')
        },
      },
    )
  }

  const handleResendOtp = () => {
    if (!forgotPasswordEmail) {
      toaster('error', 'Email not found. Please restart the password reset process.')
      return
    }
    setResendDisabled(true)
    resendOtp(
      { email: forgotPasswordEmail },
      {
        onSuccess: () => {
          toaster('success', 'New OTP sent successfully')
          const now = Date.now()
          storage.setItem(STORAGE_KEYS.RESEND_COOLDOWN_KEY, now.toString())
          setCoolDown(coolDownSeconds)
          const interval = setInterval(() => {
            setCoolDown((prev) => {
              if (prev <= 1) {
                clearInterval(interval)
                setResendDisabled(false)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        },
        onError: () => {
          setResendDisabled(false)
        },
      },
    )
  }

  useEffect(() => {
    const lastSent = storage.getItem(STORAGE_KEYS.RESEND_COOLDOWN_KEY)
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000)
      if (elapsed < coolDownSeconds) {
        const remaining = coolDownSeconds - elapsed
        setCoolDown(remaining)
        setResendDisabled(true)
        const interval = setInterval(() => {
          setCoolDown((prev) => {
            if (prev <= 1) {
              clearInterval(interval)
              setResendDisabled(false)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [])

  return (
    <Formik initialValues={{ otp: '' }} validationSchema={otpSchema} onSubmit={handleSubmit}>
      {({ setFieldValue }) => (
        <Form className="otp-form">
          <OTPInput
            val={otpValues}
            setVal={(val) => {
              setOtpValues(val)
              setFieldValue('otp', val.join(''))
            }}
              submitForm={(values, helpers) => handleSubmit(values, helpers)}

          />
          <p className="pin-resend-message mb-3">
            {t('didnt_receive_the_pin')}{' '}
            <a
              className={`resend ${resendDisabled ? 'disabled' : ''}`}
              onClick={!resendDisabled ? handleResendOtp : undefined}
            >
              {resendDisabled && !resendOtpLoading ? `${t('resend_in')} ${coolDown}s` : t('resend_PIN')}
            </a>
          </p>
          <div className="forgot-pass auth-navigation mb-4">
            <Link to={ROUTES.LOGIN} className="small forgot-link">
              {t('back_to_login')}
            </Link>
            <Link to={ROUTES.FORGOT_PASSWORD} className="small forgot-link">
              {t('back_to_forgot_password')}
            </Link>
          </div>
          <SolidButton loading={isPending} title="verify" type="submit" color="primary" className="w-100 Login-btn" />
        </Form>
      )}
    </Formik>
  )
}

export default VerifyOtpForm
