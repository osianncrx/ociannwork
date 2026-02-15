import { Col, Container, Row } from 'reactstrap'
import SvgIcon from '../../shared/icons/SvgIcon'

const Footer = () => {
  return (
    <div className="footer">
      <Container fluid>
        <Row>
          <Col md="6" className="p-0 footer-copyright">
            <p className="mb-0">Copyright 2025 © Admin theme by pixelstrap</p>
          </Col>
          <Col md="6" className="p-0">
            <p className="heart mb-0">
              Hand crafted & made with
              <SvgIcon iconId="heart" className="footer-icon ms-2" />
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Footer
