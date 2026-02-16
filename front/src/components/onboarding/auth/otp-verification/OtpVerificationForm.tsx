import { Form, Formik, FormikHelpers } from 'formik'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../../../api'
import { STORAGE_KEYS } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { OtpInput } from '../../../../shared/form-fields'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { OtpPayload } from '../../../../types'
import { getStorage } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { otpSchema } from '../../../../utils/validation-schemas'
import { initializeUserEncryptionKeysWithApi } from '../../../../utils/encryption-utils'

const isDemoMode = String(import.meta.env.VITE_APP_DEMO_MODE).toLowerCase() === 'true'
const demoOtpValue = '123456'

const VerifyOtpForm = () => {
  const coolDownSeconds = 60
  const { public_otp_digits } = useAppSelector((state) => state.publicSetting)
  const otpDigits = Number(public_otp_digits) || 6
  const initialOtpString = isDemoMode ? demoOtpValue.slice(0, otpDigits) : ''
  const initialOtpArray = useMemo<string[]>(
    () => Array.from({ length: otpDigits }, (_, idx) => initialOtpString[idx] ?? ''),
    [otpDigits, initialOtpString],
  )
  const [otpValues, setOtpValues] = useState<string[]>(initialOtpArray)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [coolDown, setCoolDown] = useState(0)
  const dispatch = useAppDispatch()
  const storage = getStorage()
  const forgotPasswordEmail = storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL) || null
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || storage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_EMAIL)
  const { mutate: verifyOtp, isPending } = mutations.useVerifyOtp()
  const { mutate: resendOtp, isPending: resendOtpLoading } = mutations.useResendOtp()
  const { t } = useTranslation()

  useEffect(() => {
    if (isDemoMode) {
      setOtpValues(initialOtpArray)
    }
  }, [initialOtpArray])

  const handleSubmit = async (values: OtpPayload, _formikHelpers: FormikHelpers<OtpPayload>) => {
    if (!checkEmail) {
      toaster('error', 'email_not_found_please_try_again')
      return
    }

    verifyOtp(
      {
        email: checkEmail,
        otp: values.otp,
      },
      {
        onSuccess: async (response) => {
          const isFromForgotPassword = !!forgotPasswordEmail
          storage.setItem(STORAGE_KEYS.OTP, values.otp)
          if (!isFromForgotPassword && checkEmail) {
            storage.setItem(STORAGE_KEYS.SHOW_PROFILE_SCREEN, response.showProfileScreen)
          }

          // Initialize E2E encryption keys for new user
          if (!isFromForgotPassword) {
            try {
              await initializeUserEncryptionKeysWithApi()
            } catch (error) {
              // Continue with the flow even if key generation fails
            }
          }

          if (isFromForgotPassword) {
            dispatch(setScreen('resetPassword'))
          } else if (response.showProfileScreen) {
            dispatch(setScreen('setupProfile'))
          } else {
            dispatch(setScreen('createTeam'))
          }
        },
      },
    )
  }

  const handleResendOtp = () => {
    if (!checkEmail) {
      toaster('error', 'email_not_found_please_restart_the_process.')
      return
    }
    setResendDisabled(true)
    resendOtp(
      { email: forgotPasswordEmail || checkEmail },
      {
        onSuccess: () => {
          const now = Date.now()
          storage.setItem(STORAGE_KEYS.RESEND_COUNTDOWN_KEY, now.toString())
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
    const lastSent = storage.getItem(STORAGE_KEYS.RESEND_COUNTDOWN_KEY)
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent, 10)) / 1000)
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
    <Formik<OtpPayload>
      initialValues={{ otp: initialOtpString }}
      validationSchema={otpSchema}
      onSubmit={handleSubmit}
      validateOnBlur={false}
      enableReinitialize
    >
      {({ setFieldValue }) => (
        <Form className="otp-form">
          <div className="otp-input-wrapper">
            <OtpInput
              submitForm={(values, helpers) => handleSubmit(values, helpers)}
              val={otpValues}
              setVal={(val: string[]) => {
                setOtpValues(val)
                setFieldValue('otp', val.join(''))
              }}
            />
          </div>

          <p>
              {t('didnt_receive_the_pin')}{' '}
              <a
                role="button"
                className={`resend link-text ${resendDisabled ? 'disabled' : ''}`}
                onClick={!resendDisabled ? handleResendOtp : undefined}
              >
                {resendDisabled && !resendOtpLoading ? `${t('resend_in')} ${coolDown}s` : t('resend_PIN')}
              </a>
            </p>

          <SolidButton loading={isPending} title="verify" type="submit" color="primary" className="mb-0 login-btn" />
        </Form>
      )}
    </Formik>
  )
}

export default VerifyOtpForm
