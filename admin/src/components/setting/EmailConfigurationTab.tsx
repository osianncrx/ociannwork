import { Col, Container, Row } from 'reactstrap'
import { TextInput } from '../../shared/form-fields'

const EmailConfigurationTab = () => {
  return (
    <Container fluid>
      <Row>
        <Col md="6">
          <TextInput name="smtp_user" label="smtp_user" placeholder="enter_your_smtp_username" />
        </Col>
        <Col md="6">
          <TextInput name="smtp_pass" label="smtp_pass" placeholder="*********" />
        </Col>
        <Col md="6">
          <TextInput name="smtp_port" label="smtp_port" placeholder="enter_port" />
        </Col>
        <Col md="6">
          <TextInput name="smtp_host" label="smtp_host" placeholder="enter_host" />
        </Col>
        <Col md="6">
          <TextInput name="mail_from_name" label="mail_from_name" placeholder="Enter mail from name" />
        </Col>
        <Col md="6">
          <TextInput name="mail_from_pass" label="mail_from_pass" placeholder="*********" />
        </Col>
      </Row>
    </Container>
  )
}

export default EmailConfigurationTab
