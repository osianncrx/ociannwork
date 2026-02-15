import Chart from 'react-apexcharts'
import { Card, CardBody, CardHeader } from 'reactstrap'
import { colors, progressBar } from '../../../data'
import { DashboardProps } from '../../../types/components/dashboard'

const LocationWiseUsers = ({ data }: DashboardProps) => {

  const locationWiseUsersItem = data?.data?.charts?.userLocationDistribution || []

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Location wise Users</h5>
        </div>
      </CardHeader>
      <CardBody>
        <div className="chart-container progress-chart progressbar-chart">
          {locationWiseUsersItem.slice(0, 4).map((item, idx) => {
            const color = colors[idx % colors.length]
            const options = progressBar({
              seriesValue: Math.round(item.percentage),
              title: item.country,
              subtitle: `${Math.round(item.percentage)}%`,
              color,
            })
            return (
              <Chart key={`${item.country}-${idx}`} options={options} series={options.series} type="bar" height={70} />
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}

export default LocationWiseUsers
