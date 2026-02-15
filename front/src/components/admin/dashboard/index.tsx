import { useEffect, useState } from 'react'
import { Col, Container, Row } from 'reactstrap'
import { queries } from '../../../api'
import { populateStats } from '../../../data'
import ActiveUsers from './ActiveUsers'
import GrowthMemberOption from './GrowthMember'
import InvitedMembers from './InvitedMembers'
import LocationWiseUsers from './LocationWiseUsers'
import MessageTypeDistribution from './MessageTypeDistribution'
import PendingRequest from './PendingRequest'
import RecentJoinedMember from './RecentJoinedMember'
import StatWidget from './StatWidget'
import StorageTracker from './StorageTracker'

const Dashboard = () => {
  const { data, refetch } = queries.useGetDashboard()
  const [dynamicWidgets, setDynamicWidgets] = useState<ReturnType<typeof populateStats>>([])

  useEffect(() => {
    refetch()
    setDynamicWidgets(populateStats(data?.data))
  }, [data, refetch])

  return (
    <div className="dashboard-admin">
      <Container fluid>
        <Row>
          {dynamicWidgets.slice(0, 6).map((columnWidgets, colIndex) => (
            <Col key={colIndex} xs={12} md={6} xl={4} xxl={3}>
              {columnWidgets.map((widget, widgetIndex) => (
                <StatWidget key={widgetIndex} {...widget} />
              ))}
            </Col>
          ))}
          {dynamicWidgets.slice(6, 8).map((columnWidgets, colIndex2) => (
            <Col key={colIndex2} xs={12} md={6} xxl={3}>
              {columnWidgets.map((widget, widgetIndex) => (
                <StatWidget key={widgetIndex} {...widget} />
              ))}
            </Col>
          ))}
          <Col xs={12} xl={6}>
            <ActiveUsers data={data} />
          </Col>
          <Col xs={12} xl={6}>
            <RecentJoinedMember />
          </Col>
          <Col xs={12}>
            <StorageTracker data={data} />
          </Col>
          <Col xs={12} md={6} xl={4}>
            <MessageTypeDistribution data={data} />
          </Col>
          <Col xs={12} xl={4} className="invited-members-col">
            <InvitedMembers data={data} />
          </Col>
          <Col xs={12} md={6} xl={4} className="location-wise-users-col">
            <LocationWiseUsers data={data} />
          </Col>
          <Col xs={12} xl={6}>
            <PendingRequest />
          </Col>
          <Col xs={12} xl={6}>
            <GrowthMemberOption data={data} />
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Dashboard
