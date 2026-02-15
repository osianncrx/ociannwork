import { Col, Container, Row } from 'reactstrap'
import { useAppDispatch } from '../store/hooks'
import { setScreen } from '../store/slices/screenSlice'
import { ROUTES } from '../constants'

const Error403 = () => {
  const dispatch = useAppDispatch()

  const handleBackToChat = () => {
    dispatch(setScreen('welcome'))
    window.location.href = ROUTES.ADMIN.HOME
  }

  return (
    <Container fluid className="text-center flex-center min-vh-100">
      <Row>
        <Col>
          <h1 className="display-3 text-danger">Access Denied</h1>
          <p className="lead">You do not have permission to access this page.</p>
          <p className="text-muted">This section is restricted to admin users only.</p>
          <button className="btn btn-primary mt-3" onClick={handleBackToChat}>
            Back to Chat
          </button>
        </Col>
      </Row>
    </Container>
  )
}

export default Error403
