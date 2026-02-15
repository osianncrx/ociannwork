import { Col, Container, Row } from 'reactstrap'
import CardWrapper from '../../shared/card/CardWrapper'
import TeamsTable from './TeamsTable'

const ManageTeams = () => {
  
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'manage_teams',
            }}
          >
            <TeamsTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default ManageTeams
