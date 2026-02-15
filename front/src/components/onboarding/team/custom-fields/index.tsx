import { useTranslation } from 'react-i18next'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import OnboardingWrapper from '../../widgets/OnboardingWrapper'
import CustomFieldForm from './CustomFieldsForm'

const CustomFields = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleCustomFieldsSubmit = () => {
    dispatch(setScreen('webScreen'))
  }

  const handleSkip = () => {
    dispatch(setScreen('webScreen'))
  }
  const handleRedirectToTeams = () => {
    dispatch(setScreen('welcome'))
  }

  return (
    <OnboardingWrapper wrapperClass="custom-fields">
      <div className="content-title">
        <div className="back-btn-badge" onClick={handleRedirectToTeams}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('custom_fields')}</h1>
      </div>
      <p>{t('please_fill_out_the_following_custom_fields')}</p>

      <CustomFieldForm onSubmit={handleCustomFieldsSubmit} />

      <div className="mt-3 text-center">
        <button type="button" className="link-text btn btn-link text-muted" onClick={handleSkip}>
          {t('skip_for_now')}
        </button>
      </div>
      <span className="text-center w-100 common-flex custom-subtitle flex-wrap bottom-footer">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </span>
    </OnboardingWrapper>
  )
}

export default CustomFields
