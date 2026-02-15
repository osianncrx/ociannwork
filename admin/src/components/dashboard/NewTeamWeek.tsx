import { ApexOptions } from 'apexcharts'
import React from 'react'
import Chart from 'react-apexcharts'
import { TeamGrowthBarChartProps } from '../../types/components/dashboard'

const NewTeamWeek: React.FC<TeamGrowthBarChartProps> = ({ data }) => {
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
      type: 'bar',
      toolbar: { show: false },
      dropShadow: {
        enabled: true,
        top: 10,
        left: 0,
        blur: 5,
        color: '#5579F8',
        opacity: 0.35,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '30%',
      },
    },
    dataLabels: {
      enabled: false,
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
      tooltip: { enabled: false },
    },
    yaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        formatter: (val: number) => val + '',
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
      strokeDashArray: 5,
      position: 'back',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    colors: ['#5579F8', '#8D83FF'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        gradientToColors: ['#5579F8', '#8D83FF'],
        opacityFrom: 0.98,
        opacityTo: 0.85,
        stops: [0, 100],
      },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val} Teams`,
      },
    },
    responsive: [
      {
        breakpoint: 1199,
        options: {
          chart: { height: 200 },
        },
      },
      {
        breakpoint: 1500,
        options: {
          plotOptions: {
            bar: {
              borderRadius: 6,
              columnWidth: '50%',
            },
          },
        },
      },
    ],
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="mb-3 fw-semibold">New Teams this week</h5>
        <Chart
          options={TeamGrowthOptions}
          series={TeamGrowthOptions.series}
          type="bar"
          height={TeamGrowthOptions.chart?.height}
        />
      </div>
    </div>
  )
}

export default NewTeamWeek
