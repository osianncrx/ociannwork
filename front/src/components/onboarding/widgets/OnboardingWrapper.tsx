import { Col, Container, Row } from 'reactstrap'
import { SvgIcon } from '../../../shared/icons'
import { Image } from '../../../shared/image'
import { useAppSelector } from '../../../store/hooks'
import { OnboardingWrapperProps } from '../../../types'

const OnboardingWrapper = ({
  children,
  showBackButton = false,
  onBackClick = () => {},
  wrapperClass = '',
}: OnboardingWrapperProps) => {
  const { onboarding_logo } = useAppSelector((state) => state.publicSetting)

  return (
    <Container fluid className={`login-wrapper auth-background welcome-card  ${wrapperClass}`}>
      <Row className="g-0 min-vh-100">
        <Col className="common-flex card-flex">
          <div className="login-card text-center">
            <div className="onboarding-wrapper-box">
              {showBackButton && (
                <div className="back-btn-badge" onClick={onBackClick}>
                  <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
                </div>
              )}
              <div className="logo">
                {onboarding_logo ? (
                  <Image src={onboarding_logo} alt="OciannWork" height={35} />
                ) : (
                  <Image src="/logo/ociannwork-logo.png" alt="OciannWork" height={35} />
                )}
              </div>
              {children}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default OnboardingWrapper
