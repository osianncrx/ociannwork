import { Container, Row } from 'reactstrap'
import ChangePassword from './change-password'
import Profile from './profile'
import UpdateTeam from './update-team'

const UserProfileContainer = () => {
  return (
    <Container fluid className="user-profile">
      <Row>
        <Profile />
        <UpdateTeam />
        <ChangePassword />
      </Row>
    </Container>
  )
}

export default UserProfileContainer
