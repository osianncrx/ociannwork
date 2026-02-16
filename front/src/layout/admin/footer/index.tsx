import { Col, Container, Row } from "reactstrap";

const Footer = () => {
  return (
    <div className="footer">
      <Container fluid>
        <Row>
          <Col md="12" className="p-0 footer-copyright">
            <p className="mb-0">Copyright 2026 © by Ociann</p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Footer;
