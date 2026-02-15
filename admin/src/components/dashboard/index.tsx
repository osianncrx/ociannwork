import { useEffect, useState } from 'react'
import { Col, Row } from 'reactstrap'
import { queries } from '../../api'
import { populateStats } from '../../data/dashboard'
import MostActiveUsers from './MostActiveUsers'
import NewTeamWeek from './NewTeamWeek'
import StatWidget from './StatWidget'
import TeamGrowthBarChart from './TeamGrowth'
import UserGrowthChart from './UserGrowth'
import RecentTeams from './RecentTeams'
import LocationWiseUsers from './LocationWiseUsers'

const Dashboard = () => {
  const { data, refetch } = queries.useGetDashboard()
  const [dynamicWidgets, setDynamicWidgets] = useState<ReturnType<typeof populateStats>>([])

  useEffect(() => {
    refetch()
    setDynamicWidgets(populateStats(data?.data))
  }, [data, refetch])

  return (
    <div className="dashboard-admin">
      <Row>
        {dynamicWidgets.map((columnWidgets) =>
          columnWidgets.map((item, index) => (
            <Col xs={12} md={6} xxl={3} key={index}>
              <StatWidget {...item} />
            </Col>
          )),
        )}
        <Col xs={12} xl={6}>
          <NewTeamWeek data={data?.data?.charts?.teamGrowthMonthly || []} />
        </Col>
        <Col xs={12} xl={6}>
          <MostActiveUsers data={data?.data?.insights?.mostActiveUsers || []} />
        </Col>
        <Col xs={12} xl={5}>
          <LocationWiseUsers data={data?.data?.locationWiseUsers || []} />
        </Col>
        <Col xs={12} xl={7}>
          <UserGrowthChart data={data?.data?.charts?.userGrowthMonthly || []} />
        </Col>
        <Col xs={12} xl={6}>
          <RecentTeams />
        </Col>
        <Col xs={12} xl={6}>
          <TeamGrowthBarChart data={data?.data?.charts?.teamGrowthMonthly || []} />
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
