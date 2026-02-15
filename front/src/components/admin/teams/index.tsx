import { Col, Container, Row } from 'reactstrap'
import { CardWrapper } from '../../../shared/card'
import TeamsTable from './TeamsTable'

const ManageTeams = () => {
  return (
    <Container fluid>
      <Row>
        <Col xl="12" >
        <div className="custom-manage-teams">
          <CardWrapper
            heading={{
              title: 'manage_members',
            }}
          >
            <TeamsTable />
          </CardWrapper>
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default ManageTeams
