import { ApexOptions } from 'apexcharts'
import { DashboardResponse, ProgressBarProps, Stats } from '../types'

export const populateStats = (data: DashboardResponse['data'] | undefined): Stats[][] => {
  if (!data?.counts) return []
  return [
    [
      {
        icon: '../assets/svg/widget-1.svg',
        count: data.counts.totalUsers || 0,
        label: 'Total Members',
        trendValue: data.counts.totalMembersGrowth ? parseFloat(data.counts.totalMembersGrowth) : 0,
        isIncrease: data.counts.totalMembersGrowth ? parseFloat(data.counts.totalMembersGrowth) >= 0 : false,
      },
      {
        icon: '../assets/svg/widget-3.svg',
        count: data.counts.totalChannels || 0,
        label: 'Total Channel',
        trendValue: data.counts.totalChannelsGrowth ? parseFloat(data.counts.totalChannelsGrowth) : 0,
        isIncrease: data.counts.totalChannelsGrowth ? parseFloat(data.counts.totalChannelsGrowth) >= 0 : false,
      },
      {
        icon: '../assets/svg/widget-5.svg',
        count: data.counts.totalOnlineUsers || 0,
        label: 'Total Online Users',
        trendValue: data.counts.totalOnlineUsersGrowth ? parseFloat(data.counts.totalOnlineUsersGrowth) : 0,
        isIncrease: data.counts.totalOnlineUsersGrowth ? parseFloat(data.counts.totalOnlineUsersGrowth) >= 0 : false,
      },
      {
        icon: '../assets/svg/widget-4.svg',
        count: data.counts.totalFileShared || 0,
        label: 'File Shared',
        trendValue: data.counts.fileSharedGrowth ? parseFloat(data.counts.fileSharedGrowth) : 0,
        isIncrease: data.counts.fileSharedGrowth ? parseFloat(data.counts.fileSharedGrowth) >= 0 : false,
      },
    ],
  ]
}

export const progressBar = ({ seriesValue, title, subtitle, color }: ProgressBarProps): ApexOptions => {
  return {
    chart: {
      height: 70,
      type: 'bar',
      stacked: true,
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        speed: 1200,
        animateGradually: {
          enabled: true,
          delay: 100,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 800,
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '15%',
        colors: {
          backgroundBarColors: [color],
          backgroundBarOpacity: 0.2,
          backgroundBarRadius: 5,
        },
      },
    },
    colors: [color],
    stroke: { width: 0 },
    fill: {
      colors: [color],
      type: 'gradient',
      gradient: { gradientToColors: [color] },
      opacity: 1,
    },
    series: [{ name: title, data: [seriesValue] }],
    title: {
      floating: true,
      offsetX: -10,
      offsetY: 5,
      text: title,
      style: { fontSize: '15px', fontFamily: 'Roboto, sans-serif', fontWeight: 500 },
    },
    subtitle: {
      floating: true,
      align: 'right',
      offsetY: 0,
      text: subtitle,
      style: { fontSize: '14px' },
    },
    tooltip: { enabled: false },
    xaxis: { categories: [title] },
    yaxis: { max: 100 },
    responsive: [
      {
        breakpoint: 767,
        options: { title: { style: { fontSize: '16px' } } },
      },
    ],
  }
}
