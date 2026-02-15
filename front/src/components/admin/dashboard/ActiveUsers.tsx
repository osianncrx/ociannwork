import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import { Card, CardBody, CardHeader } from 'reactstrap'
import { allMonths, getActiveUsersChartOptions } from '../../../data'
import { DashboardProps } from '../../../types/components/dashboard'

const ActiveUsers = ({ data }: DashboardProps) => {
  const chartData = useMemo(() => {
    const activeUsersData = data?.data?.charts?.activeUsersGraph || []
    const monthlyData: { [key: string]: number } = {}
    const months = allMonths

    activeUsersData.forEach((item) => {
      const date = new Date(item.date)
      const monthIndex = date.getMonth()
      const monthName = months[monthIndex]

      if (!monthlyData[monthName]) {
        monthlyData[monthName] = 0
      }
      monthlyData[monthName] += item.active_users
    })

    const categories = months
    const values = months.map((month) => monthlyData[month] || 0)

    return { categories, values }
  }, [data])

  const chartOptions = useMemo(
    () => getActiveUsersChartOptions(chartData.categories, chartData.values),
    [chartData.categories, chartData.values],
  )

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Active Users</h5>
        </div>
      </CardHeader>
      <CardBody>
        <div className="chart-right w-100">
          <div className="activity-wrap">
            <div>
              <Chart options={chartOptions} series={chartOptions.series} type="bar" height={376} />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default ActiveUsers
