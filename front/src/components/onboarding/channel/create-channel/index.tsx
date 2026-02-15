import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import OnboardingWrapper from '../../widgets/OnboardingWrapper'
import CreateChannelForm from './CreateChannelForm'
import { SvgIcon } from '../../../../shared/icons'

const CreateChannel = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  return (
    <OnboardingWrapper wrapperClass="welcome-card invite-channel">
      <div className="content-title">
        <div className="back-btn-badge" onClick={() => dispatch(setScreen('channelBanner'))}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('give_your_first_channel_name')}</h1>
      </div>
      <p className="margin-b-15">{t('create_channel_subtitle')}</p>
      <CreateChannelForm />
      <span className="text-center w-100 common-flex custom-subtitle flex-wrap bottom-footer">
        {t('looking_for_a_fresh_start')}
        <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
          {t('begin_now')}
        </div>
      </span>
    </OnboardingWrapper>
  )
}

export default CreateChannel
