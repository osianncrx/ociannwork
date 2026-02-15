import { Form, Formik } from 'formik'
import { STORAGE_KEYS } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { TextInput } from '../../../../shared/form-fields'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { getStorage } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { nameSchema, yupObject } from '../../../../utils/validation-schemas'
import { hideLoader, showLoader } from '../../../../store/slices/loaderSlice'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { setTeamName } from '../../../../store/slices/teamSlice'

const CreateTeamForm = () => {
  const dispatch = useAppDispatch()
  const storage = getStorage()
  const { loading } = useAppSelector((store) => store.loader)
  const { t } = useTranslation()

  const handleCreateTeam = async ({ name }: { name: string }) => {
    try {
      dispatch(showLoader())
      setTimeout(() => {
        dispatch(setTeamName(name))
        dispatch(setScreen('termsAndConditions'))
        dispatch(hideLoader())
      }, 1000)
    } catch (error: any) {
      toaster('error', error?.message)
    }
  }

  useEffect(() => {
    storage.removeItem(STORAGE_KEYS.OTP)
  }, [])

  return (
    <Formik
      initialValues={{ name: '' }}
      validationSchema={yupObject({ name: nameSchema('Team name') })}
      onSubmit={handleCreateTeam}
      validateOnBlur={false}
    >
      {() => (
        <Form className="login-form">
          <div className="login-input">
            <TextInput
              autoFocus
              layout="vertical"
              label="name_your_team"
              name="name"
              type="text"
              placeholder="e.g. Team synergy"
              className="custom-input"
            />
          </div>

          <p className="margin-b-30 lh-custom w-100">
            {t('looking_to_join_an_existing_team')}{' '}
            <a className="forgot-pass small recover-ease" onClick={() => dispatch(setScreen('discoverTeam'))}>
              {t('find_your_team')}
            </a>
          </p>

          <SolidButton title="next" loading={loading} type="submit" color="primary" className="w-100 login-btn" />
        </Form>
      )}
    </Formik>
  )
}

export default CreateTeamForm
