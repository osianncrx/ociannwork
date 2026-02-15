import { Col, Container, Row } from 'reactstrap'
import { TextInput } from '../../shared/form-fields'

const ContactDetails = () => {
  return (
    <Container fluid>
      <Row>
        <Col md="6">
          <TextInput name="contact_email" label="contact_email" placeholder="enter_your_app_name" />
        </Col>
        <Col md="6">
          <TextInput name="contact_phone" label="contact_phone" placeholder="enter_your_app_name" />
        </Col>
        <Col md="6">
          <TextInput name="company_address" label="company_address" placeholder="enter_your_app_name" />
        </Col>
        <Col md="6">
          <TextInput name="support_email" label="support_email" placeholder="yened76275@hazhab.com" />
        </Col>
      </Row>
    </Container>
  )
}

export default ContactDetails
