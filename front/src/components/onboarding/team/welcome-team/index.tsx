import { useTranslation } from 'react-i18next'
import { Col, Container, Row } from 'reactstrap'
import { Href, STORAGE_KEYS } from '../../../../constants'
import { Image } from '../../../../shared/image'
import { getStorage } from '../../../../utils'
import WelcomeTeamForm from './WelcomeTeamForm'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'

const WelcomeTeam = () => {
  const storage = getStorage()
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || null
  const { logo_light_url, logo_dark_url } = useAppSelector((state) => state.publicSetting)
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const handleJoinAddTeam = () => {
    storage.setItem(STORAGE_KEYS.ADDING_TEAM, true)
    dispatch(setScreen('createTeam'))
  }

  return (
    <Container fluid className="login-wrapper welcome-card">
      <Row className="g-0 min-vh-100">
        <Col xl="5" className="left-panel">
          <div className="bg-img bg-1 welcome-page"></div>
          <div className="bg-img bg-2 "></div>
        </Col>
        <Col xl="7" className="common-flex card-flex">
          <div className="login-card text-center">
            <div className="logo">
              {logo_light_url ? (
                <Image
                  src={mixBackgroundLayout == 'light' ? logo_light_url : logo_dark_url}
                  alt="OciannWork"
                  height={35}
                />
              ) : (
                <Image src="/logo/ociannwork-logo.png" alt="OciannWork" height={35} />
              )}
            </div>
            <div className="content-title">
              <h1>{t('great_to_see_you')} - welcome!</h1>
            </div>
            <p className="w-100">{t('choose_a_team_below_to_get_back_to_working_with_your_team')}</p>
            <p className="mb-2">
              {t('teams_for')}{' '}
              <a href={Href} className="email-text">
                {checkEmail}
              </a>
            </p>
            <WelcomeTeamForm />
            <span className="text-center w-100 common-flex custom-subtitle flex-wrap fs-16">
              {t('looking_for_a_fresh_start')}
              <div className="link-text ms-1" onClick={() => dispatch(setScreen('email'))}>
                {t('begin_now')}
              </div>
            </span>
            <span className="bottom-footer">
              Want to add or join new team?
              <div className="link-text ms-1" onClick={handleJoinAddTeam}>
                {t('Add or Join')}
              </div>
            </span>
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default WelcomeTeam
