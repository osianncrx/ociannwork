import { Container, Row } from 'reactstrap'
import ChangePassword from './change-password'
import Profile from './profile'

const UserProfileContainer = () => {
  return (
    <Container fluid className="user-profile">
      <Row>
        <Profile />
        <ChangePassword />
      </Row>
    </Container>
  )
}

export default UserProfileContainer
