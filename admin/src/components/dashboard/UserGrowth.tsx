import { ApexOptions } from 'apexcharts'
import React from 'react'
import Chart from 'react-apexcharts'
import { UserGrowthChartProps } from '../../types/components/dashboard'

const UserGrowthChart: React.FC<UserGrowthChartProps> = ({ data }) => {
  const months = data.map((item) => {
    const [year, month] = item.month.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleString('en-US', { month: 'short' })
  })

  const totalUsers = data.map((item) => item.total_users)

  const options: ApexOptions = {
    series: [
      {
        name: 'Users',
        data: totalUsers,
      },
    ],
    chart: {
      height: 288,
      type: 'area',
      toolbar: { show: false },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#5579F8'],
    },
    xaxis: {
      type: 'category',
      categories: months,
      tickPlacement: 'on',
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'Rubik, sans-serif',
          colors: '#666666',
        },
      },
      axisTicks: { show: false },
      axisBorder: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `${val}`,
        style: {
          fontSize: '12px',
          fontFamily: 'Rubik, sans-serif',
          colors: '#666666',
        },
      },
      tickAmount: 5,
    },
    grid: {
      borderColor: 'rgba(200, 200, 200, 0.3)',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    colors: ['#5579f8'],
    fill: {
      type: 'gradient',
      gradient: {
        type: 'vertical',
        opacityFrom: 0.6,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val} Users`,
      },
    },
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="mb-3 fw-semibold">User Growth</h5>
        <Chart options={options} series={options.series} type="area" height={options.chart?.height} />
      </div>
    </div>
  )
}

export default UserGrowthChart
