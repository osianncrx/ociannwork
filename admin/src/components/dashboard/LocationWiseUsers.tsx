import Chart from 'react-apexcharts'
import { Card, CardBody, CardHeader } from 'reactstrap'
import { progressBar } from '../../data/dashboard'
import { LocationWiseUsersProps } from '../../types/components/dashboard'

const COLORS: string[] = ['#547df4', '#f7a85d', '#727272', '#1cae7f', '#9b59b6']

const LocationWiseUsers: React.FC<LocationWiseUsersProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5 className="fw-semibold">Location wise Users</h5>
        </div>
      </CardHeader>
      <CardBody>
        <div className="chart-container progress-chart progressbar-chart">
          {data.slice(0, 4).map((item, idx) => {
            const color = COLORS[idx % COLORS.length]
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
