import { Col, Container, Row } from 'reactstrap'
import CardWrapper from '../../shared/card/CardWrapper'
import UsersTable from './UsersTable'

const ManageUsers = () => {
  
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'manage_users',
              subtitle: 'view_and_control_user_access_and_permissions',
            }}
          >
            <UsersTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default ManageUsers
