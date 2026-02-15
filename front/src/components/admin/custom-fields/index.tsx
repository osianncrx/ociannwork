import { Col, Container, Row } from 'reactstrap'
import { ROUTES } from '../../../constants'
import CardWrapper from '../../../shared/card/CardWrapper'
import CustomFieldTable from './CustomFieldTable'

const CustomFields = () => {
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'custom_field',
            }}
            showAddNew={{
              redirectUrl: ROUTES.ADMIN.CREATE_CUSTOM_FIELD,
            }}
            className="custom-card-header"
          >
            <CustomFieldTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default CustomFields
