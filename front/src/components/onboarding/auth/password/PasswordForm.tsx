import { Form, Formik } from 'formik'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { post, queries } from '../../../../api'
import { STORAGE_KEYS, URL_KEYS } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { TextInput } from '../../../../shared/form-fields'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { loginSuccess } from '../../../../store/slices/authSlice'
import { hideLoader, showLoader } from '../../../../store/slices/loaderSlice'
import { setScreen } from '../../../../store/slices/screenSlice'
import { LoginPayload, LoginResponse } from '../../../../types'
import { getStorage } from '../../../../utils'
import { errorMessage, toaster } from '../../../../utils/custom-functions'
import { emailSchema } from '../../../../utils/validation-schemas'
import { initializeUserEncryptionKeysWithApi } from '../../../../utils/encryption-utils'

const PasswordForm = () => {
  const dispatch = useAppDispatch()
  const { loading } = useAppSelector((store) => store.loader)
  const [showPassword, setShowPassword] = useState(false)
  const storage = getStorage()
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || null
  const { t } = useTranslation()
  const { refetch: fetchTeams } = queries.useGetTeamList()

  const handleSubmit = async (values: LoginPayload) => {
    try {
      dispatch(showLoader())
      const result: LoginResponse = await post(URL_KEYS.Auth.Login, values)
      dispatch(loginSuccess(result))

      // Initialize E2E encryption keys for logged-in user
      try {
        await initializeUserEncryptionKeysWithApi()
      } catch (error) {
        // Continue with the flow even if key generation fails
      }

      if (result.showTeamsScreen) {
        const { data: updatedTeamList } = await fetchTeams()

        if (result.teamId || updatedTeamList?.teams?.length) {
          dispatch(setScreen('welcome'))
        } else if (!result.teamId) {
          if (result.isProfileUpdated) {
            storage.setItem(STORAGE_KEYS.ADDING_TEAM, true)
          }
          dispatch(setScreen('createTeam'))
        } else {
          dispatch(setScreen('webScreen'))
        }
      }

      dispatch(hideLoader())
    } catch (error) {
      dispatch(hideLoader())
      toaster('error', errorMessage(error))
    }
  }

  return (
    <Formik
      initialValues={{
        email: checkEmail,
        password: '',
      }}
      validationSchema={emailSchema}
      onSubmit={handleSubmit}
      validateOnBlur={false}
    >
      {() => (
        <Form className="login-form ">
          <TextInput
            autoFocus
            layout="vertical"
            className="margin-b-5"
            label="password"
            iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="**********"
            children={
              <div className="password-wrap password-box" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <SvgIcon className="icon-eye" iconId="show-eye" />
                ) : (
                  <SvgIcon className="icon-eye" iconId="hide-eye" />
                )}
              </div>
            }
          />
          <div className="flex-end forgot-pass">
            <div className="recover-ease" onClick={() => dispatch(setScreen('forgotPassword'))}>
              {t('forgot_password')}
            </div>
          </div>

          <SolidButton title="login_button" type="submit" color="primary" className="w-100 login-btn" loading={loading} />
        </Form>
      )}
    </Formik>
  )
}
export default PasswordForm
