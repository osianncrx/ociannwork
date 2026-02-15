import { Col, Container, Row } from 'reactstrap'
import CardWrapper from '../../../shared/card/CardWrapper'
import TeamMembersTable from './TeamMembersTable'

const ManageTeamMembers = () => {
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'manage_team_members',
            }}
            backBtn={true}
          >
            <TeamMembersTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default ManageTeamMembers
