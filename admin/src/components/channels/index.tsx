import { Col, Container, Row } from 'reactstrap'
import CardWrapper from '../../shared/card/CardWrapper'
import ChannelsTable from './ChannelsTable'

const ManageChannels = () => {
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'manage_channels',
            }}
          >
            <ChannelsTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default ManageChannels
