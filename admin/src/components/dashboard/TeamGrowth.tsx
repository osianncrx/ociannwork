import { ApexOptions } from 'apexcharts'
import React from 'react'
import Chart from 'react-apexcharts'
import { TeamGrowthBarChartProps } from '../../types/components/dashboard'

const TeamGrowthBarChart: React.FC<TeamGrowthBarChartProps> = ({ data }) => {
  const months = data.map((item) => {
    const [year, month] = item.month.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleString('en-US', { month: 'short' })
  })
  const totalTeams = data.map((item) => Number(item.total_teams))

  const TeamGrowthOptions: ApexOptions = {
    series: [
      {
        name: 'Teams',
        data: totalTeams,
      },
    ],
    chart: {
      height: 368,
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      dropShadow: {
        enabled: true,
        top: 5,
        left: 0,
        blur: 5,
        color: '#5579F8',
        opacity: 0.5,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    stroke: {
      curve: 'stepline',
      width: 3,
      colors: ['#5579F8'],
      lineCap: 'round',
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 5,
      colors: ['#fff'],
      strokeColors: '#5579F8',
      strokeWidth: 2,
      hover: {
        size: 8,
      },
    },
    xaxis: {
      categories: months,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'Rubik, sans-serif',
          colors: '#666666',
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
        style: {
          fontSize: '12px',
          fontFamily: 'Rubik, sans-serif',
          colors: '#666666',
        },
      },
    },
    grid: {
      show: true,
      borderColor: 'rgba(200, 200, 200, 0.3)',
      strokeDashArray: 0,
      position: 'back',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    colors: ['#5579F8'],
    fill: {
      type: 'solid',
      opacity: 0.9,
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val} Teams`,
      },
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          chart: { height: 200 },
        },
      },
    ],
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="mb-3 fw-semibold">Team Growth</h5>
        <Chart
          options={TeamGrowthOptions}
          series={TeamGrowthOptions.series}
          type="line"
          height={TeamGrowthOptions.chart?.height}
        />
      </div>
    </div>
  )
}

export default TeamGrowthBarChart
