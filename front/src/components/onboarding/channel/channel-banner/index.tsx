import { useTranslation } from 'react-i18next'
import { Button } from 'reactstrap'
import { channelBannerData } from '../../../../data'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import OnboardingWrapper from '../../widgets/OnboardingWrapper'

const ChannelBanner = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  return (
    <OnboardingWrapper wrapperClass="channels">
      <div className="content-title">
        <div className="back-btn-badge" onClick={() => dispatch(setScreen('inviteTeam'))}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('chat_in_channels')}</h1>
      </div>
      <p className="margin-b-30">{t('chat_in_channels_subtitle')}</p>
      <span className="d-flex divider-text margin-b-12">{t('choose_a_topic_to_discuss_on_your_channel')}</span>

      {channelBannerData?.map((item, i) => (
        <div className="team-data team-records" onClick={() => dispatch(setScreen('createChannel'))} key={i}>
          <div className="team-des">
            <div className="user-info">
              <SvgIcon iconId={item.svg} className="svg-hw-30" />
            </div>
            <div className="user-data">
              <div>
                <h5>{item?.heading}</h5>
                <span className="divider-text">{item?.example}</span>
              </div>
              <Button
                className="team-link-text btn-outline-primary  gap-2 flex-between"
                onClick={() => dispatch(setScreen('createChannel'))}
              >
                <SvgIcon className="base-svg-hw" iconId="left-arrow" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div onClick={() => dispatch(setScreen('webScreen'))} className="link-text">
        {t('i_will_do_this_later')}
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

export default ChannelBanner
