import { Col, Container, Row } from 'reactstrap'
import { Image } from '../../shared/image'
import { AuthWrapperProps } from '../../types'

const AuthWrapper = ({ children,bg='' }: AuthWrapperProps) => {
  return (
    <Container fluid className="login-wrapper">
      <Row className="g-0 min-vh-100">
        <Col xl="5" className="left-panel">
          <div className={`bg-img bg-1 ${bg}`}></div>
          <div className="bg-img bg-2 "></div>
        </Col>
        <Col xl="7" className="common-flex card-flex">
          <div className="login-card text-center p-4">
            <div className="logo">
              <Image src="/logo/ociannwork-logo.png" alt="OciannWork" style={{ height: '40px' }} />
            </div>
            {children}
          </div>
        </Col>
      </Row>
    </Container>
  )
}
export default AuthWrapper
