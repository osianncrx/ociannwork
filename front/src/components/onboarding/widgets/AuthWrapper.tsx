import { Col, Container, Row } from 'reactstrap'
import { Image } from '../../../shared/image'
import { AuthWrapperProps } from '../../../types'
import { useAppSelector } from '../../../store/hooks'

const AuthWrapper = ({ children, bg = '' }: AuthWrapperProps) => {
  const { onboarding_logo } = useAppSelector((state) => state.publicSetting)

  return (
    <Container fluid className="login-wrapper">
      <Row className="g-0 min-vh-100">
        <Col lg="5" className="left-panel">
          <div className={`bg-img bg-1 ${bg}`}></div>
          <div className="bg-img bg-2"></div>
        </Col>
        <Col lg="5" className="common-flex card-flex">
          <div className="login-card text-center">
            <div className="logo">
              {onboarding_logo ? (
                <Image src={onboarding_logo} alt="OciannWork" height={35} />
              ) : (
                <Image src="/logo/ociannwork-logo.png" alt="OciannWork" height={35} />
              )}
            </div>
            {children}
          </div>
        </Col>
      </Row>
    </Container>
  )
}
export default AuthWrapper
