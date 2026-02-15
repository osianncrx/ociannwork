import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import { Card, CardBody, CardHeader } from 'reactstrap'
import { allMonths, getGrowthMemberChartOptions } from '../../../data'
import { DashboardProps } from '../../../types/components/dashboard'

const GrowthMember = ({ data }: DashboardProps) => {
  const chartData = useMemo(() => {
    const growthData = data?.data?.charts?.growthMemberChart || []
    const months = allMonths
    const monthlyData: { [key: string]: number } = {}

    growthData.forEach((item) => {
      const date = new Date(item.date)
      const monthIndex = date.getMonth()
      const monthName = months[monthIndex]
      monthlyData[monthName] = parseInt(item.total_members)
    })

    const categories: string[] = []
    const values: number[] = []

    let lastKnownValue = 0
    months.forEach((month) => {
      categories.push(month)
      if (monthlyData[month] !== undefined) {
        lastKnownValue = monthlyData[month]
        values.push(lastKnownValue)
      } else {
        values.push(lastKnownValue)
      }
    })

    return { categories, values }
  }, [data])

  const chartOptions = useMemo(
    () => getGrowthMemberChartOptions(chartData.categories, chartData.values),
    [chartData.categories, chartData.values],
  )

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Growth Member</h5>
        </div>
      </CardHeader>
      <CardBody>
        <div className="chart-container">
          <Chart options={chartOptions} series={chartOptions.series} type="area" height={334} />
        </div>
      </CardBody>
    </Card>
  )
}

export default GrowthMember
