import { ApexOptions } from 'apexcharts'
import { ProgressBarProps, Stats } from '../types/common'
import { DashboardResponse } from '../types/components/dashboard'

export const channelBannerData = [
  { svg: 'rocket', heading: 'Current Project / Initiative', example: 'i.e: Mobile app development, marketing' },
  {
    svg: 'connections',
    heading: 'Latest Client Request / Feature',
    example: 'i.e: Newsletter Module, Language Translation',
  },
  {
    svg: 'icon-team',
    heading: 'Learning & Development / Education',
    example: 'i.e: SQL mastery project, full stack dev bootcamp',
  },
]

export const progressList = [
  { title: 'Mumbai', subtitle: '50%', seriesValue: 50, color: '#547df4' },
  { title: 'Bangalore', subtitle: '30%', seriesValue: 30, color: '#f7a85d' },
  { title: 'Delhi', subtitle: '40%', seriesValue: 40, color: '#727272' },
  { title: 'Hyderabad', subtitle: '60%', seriesValue: 60, color: '#1cae7f' },
]

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
          backgroundBarRadius: 10,
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
      style: { fontSize: '18px', fontFamily: 'Roboto, sans-serif', fontWeight: 500 },
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

export const populateStats = (data: DashboardResponse['data'] | undefined): Stats[][] => {
  if (!data?.counts) return []
  return [
    [
      {
        icon: '../assets/svg/widget-1.svg',
        count: data.counts.totalMembers || 0,
        label: 'Total Members',
        trendValue: data.counts.totalMembersGrowth ? parseFloat(data.counts.totalMembersGrowth) : 0,
        isIncrease: data.counts.totalMembersGrowth ? parseFloat(data.counts.totalMembersGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-2.svg',
        count: data.counts.newThisWeek || 0,
        label: 'New This Week',
        trendValue: data.counts.newThisWeekGrowth ? parseFloat(data.counts.newThisWeekGrowth) : 0,
        isIncrease: data.counts.newThisWeekGrowth ? parseFloat(data.counts.newThisWeekGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-3.svg',
        count: data.counts.totalChannels || 0,
        label: 'Total Channel',
        trendValue: data.counts.totalChannelsGrowth ? parseFloat(data.counts.totalChannelsGrowth) : 0,
        isIncrease: data.counts.totalChannelsGrowth ? parseFloat(data.counts.totalChannelsGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-4.svg',
        count: data.counts.fileShared || 0,
        label: 'File Shared',
        trendValue: data.counts.fileSharedGrowth ? parseFloat(data.counts.fileSharedGrowth) : 0,
        isIncrease: data.counts.fileSharedGrowth ? parseFloat(data.counts.fileSharedGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-5.svg',
        count: data.counts.totalOnlineUsers || 0,
        label: 'Online Users',
        trendValue: data.counts.totalOnlineUsersGrowth ? parseFloat(data.counts.totalOnlineUsersGrowth) : 0,
        isIncrease: data.counts.totalOnlineUsersGrowth ? parseFloat(data.counts.totalOnlineUsersGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-6.svg',
        count: data.counts.totalChats || 0,
        label: 'Total Chats',
        trendValue: data.counts.totalChatsGrowth ? parseFloat(data.counts.totalChatsGrowth) : 0,
        isIncrease: data.counts.totalChatsGrowth ? parseFloat(data.counts.totalChatsGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-7.svg',
        count: data.counts.mediaShared || 0,
        label: 'Media Shared',
        trendValue: data.counts.mediaSharedGrowth ? parseFloat(data.counts.mediaSharedGrowth) : 0,
        isIncrease: data.counts.mediaSharedGrowth ? parseFloat(data.counts.mediaSharedGrowth) >= 0 : false,
      },
    ],
    [
      {
        icon: '../assets/svg/widget-8.svg',
        count: data.counts.totalCalls || 0,
        label: 'Total Calls',
        trendValue: data.counts.totalCallsGrowth ? parseFloat(data?.counts?.totalCallsGrowth) : 0,
        isIncrease: data.counts.totalCallsGrowth ? parseFloat(data.counts.totalCallsGrowth) >= 0 : false,
      },
    ],
  ]
}

export const messageTypeDistributionOptions: ApexOptions = {
  labels: [],
  series: [],
  chart: {
    type: 'donut',
    height: 300,
  },
  dataLabels: {
    enabled: false,
  },
  legend: {
    position: 'bottom',
    fontSize: '14px',
    fontFamily: 'Rubik, sans-serif',
    fontWeight: 500,
    labels: {
      colors: '#495057',
    },
    markers: {
      size: 6,
      shape: 'square',
    },
    itemMargin: {
      horizontal: 7,
      vertical: 0,
    },
  },
  plotOptions: {
    pie: {
      expandOnClick: false,
      donut: {
        size: '63%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '34px',
            fontWeight: 500,
            color: '495057',
            offsetY: 7,
          },
          total: {
            show: true,
            fontSize: '20px',
            fontFamily: 'Rubik, sans-serif',
            fontWeight: 500,
            color: '#495057',
            formatter: () => '0', 
            label: 'Total',
          },
        },
      },
    },
  },
  states: {
    hover: {
      filter: {
        type: 'none',
      },
    },
    active: {
      allowMultipleDataPointsSelection: false,
      filter: {
        type: 'none',
      },
    },
  },
  colors: ['#547df4', '#f7a85d', '#1cae7f', '#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff'],
  responsive: [
    {
      breakpoint: 1400,
      options: {
        chart: {
          height: 280,
        },
      },
    },
    {
      breakpoint: 1200,
      options: {
        chart: {
          height: 260,
        },
      },
    },
    {
      breakpoint: 992,
      options: {
        chart: {
          height: 240,
        },
        plotOptions: {
          pie: {
            donut: {
              size: '60%',
            },
          },
        },
      },
    },
    {
      breakpoint: 768,
      options: {
        chart: {
          height: 220,
        },
        legend: {
          fontSize: '12px',
        },
        plotOptions: {
          pie: {
            donut: {
              size: '58%',
            },
          },
        },
      },
    },
    {
      breakpoint: 576,
      options: {
        chart: {
          height: 200,
        },
        plotOptions: {
          pie: {
            donut: {
              size: '55%',
            },
          },
        },
      },
    },
    {
      breakpoint: 400,
      options: {
        chart: {
          height: 180,
        },
        plotOptions: {
          pie: {
            donut: {
              size: '50%',
            },
          },
        },
      },
    },
  ],  
}

export const monthlyTargetData: ApexOptions = {
  series: [92.77],
  chart: {
    type: 'radialBar',
    height: 320,
    offsetY: -20,
    sparkline: {
      enabled: true,
    },
  },
  legend: {
    show: true,
    position: 'bottom',
    fontSize: '14px',
    fontFamily: 'Rubik, sans-serif',
    fontWeight: 500,
    labels: {
      colors: '#495057',
    },
    markers: {
      size: 6,
      shape: 'square',
    },
  },
  plotOptions: {
    radialBar: {
      hollow: {
        size: '65%',
      },
      startAngle: -90,
      endAngle: 90,
      track: {
        background: '#d7e2e9',
        strokeWidth: '97%',
        margin: 5,
        dropShadow: {
          enabled: true,
          top: 2,
          left: 0,
          color: '#999',
          opacity: 1,
          blur: 2,
        },
      },
      dataLabels: {
        name: {
          show: true,
          offsetY: -10,
        },
        value: {
          show: true,
          offsetY: -50,
          fontSize: '18px',
          fontWeight: '600',
          color: '#2F2F3B',
        },
        total: {
          show: true,
          label: '+60%',
          color: '#7366FF',
          fontSize: '14px',
          fontFamily: 'Rubik, sans-serif',
          fontWeight: 400,
          formatter: function () {
            return '89%'
          },
        },
      },
    },
  },
  grid: {
    padding: {
      top: -10,
    },
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      shadeIntensity: 0.4,
      inverseColors: false,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [100],
      colorStops: [
        {
          offset: 0,
          color: '#7366FF',
          opacity: 1,
        },
      ],
    },
  },
}

export const getActiveUsersChartOptions = (categories: string[], values: number[]): ApexOptions => {
  return {
    series: [
      {
        name: 'Active Users',
        data: values,
      },
    ],
    chart: {
      height: 350,
      type: 'bar',
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '45%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'inherit',
          colors: '#6c757d',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'inherit',
          colors: '#6c757d',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    colors: ['#4F7CFF'],
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' users'
        },
      },
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          chart: {
            height: 320,
          },
        },
      },
      {
        breakpoint: 992,
        options: {
          chart: {
            height: 300,
          },
          plotOptions: {
            bar: {
              columnWidth: '55%',
            },
          },
        },
      },
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 260,
          },
          plotOptions: {
            bar: {
              columnWidth: '60%',
            },
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '10px',
              },
            },
          },
        },
      },
      {
        breakpoint: 576,
        options: {
          chart: {
            height: 220,
          },
          plotOptions: {
            bar: {
              columnWidth: '65%',
            },
          },
        },
      },
    ],
    
  }
}

export const getGrowthMemberChartOptions = (categories: string[], values: number[]): ApexOptions => {
  return {
    chart: {
      toolbar: { show: false },
      height: 300,
      type: 'area',
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'inherit',
          colors: '#6c757d',
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'inherit',
          colors: '#6c757d',
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: {
      borderColor: 'rgba(196,196,196, 0.3)',
      padding: {
        top: -20,
        right: -16,
        bottom: 0,
        left: 10,
      },
    },
    fill: {
      opacity: 0.2,
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    colors: ['#5470FF'],
    series: [
      {
        name: 'Members',
        data: values,
      },
    ],
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' members'
        },
      },
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          chart: {
            height: 280,
          },
        },
      },
      {
        breakpoint: 992,
        options: {
          chart: {
            height: 260,
          },
          stroke: {
            width: 2.5,
          },
        },
      },
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 230,
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '10px',
              },
            },
          },
        },
      },
      {
        breakpoint: 576,
        options: {
          chart: {
            height: 200,
          },
          stroke: {
            width: 2,
          },
        },
      },
    ],
    
  }
}

export const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const fileTypes = {
  image: {
    mime: ['image/'],
    extensions: 'image/*',
  },
  video: {
    mime: ['video/'],
    extensions: 'video/*',
  },
  audio: {
    mime: ['audio/'],
    extensions: 'audio/*',
  },
  pdf: {
    mime: ['application/pdf', 'application/x-pdf'],
    extensions: '.pdf',
  },
  document: {
    mime: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    extensions: '.doc,.docx,.txt',
  },
  spreadsheet: {
    mime: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    extensions: '.xls,.xlsx,.csv',
  },
  presentation: {
    mime: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: '.ppt,.pptx',
  },
  json: {
    mime: ['application/json'],
    extensions: '.json',
  },
  archive: {
    mime: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    extensions: '.zip,.rar,.7z',
  },

  // Direct extensions mapping
  '.png': { mime: ['image/png'], extensions: '.png' },
  '.jpg': { mime: ['image/jpeg'], extensions: '.jpg' },
  '.jpeg': { mime: ['image/jpeg'], extensions: '.jpeg' },
  '.gif': { mime: ['image/gif'], extensions: '.gif' },
  '.svg': { mime: ['image/svg+xml'], extensions: '.svg' },
  '.webp': { mime: ['image/webp'], extensions: '.webp' },
  '.bmp': { mime: ['image/bmp'], extensions: '.bmp' },
  '.csv': { mime: ['text/csv'], extensions: '.csv' },

  '.zip': { mime: ['application/zip', 'application/x-zip-compressed'], extensions: '.zip' },
  '.rar': { mime: ['application/x-rar-compressed'], extensions: '.rar' },
  '.7z': { mime: ['application/x-7z-compressed'], extensions: '.7z' },

  '.mp4': { mime: ['video/mp4'], extensions: '.mp4' },
  '.webm': { mime: ['video/webm', 'audio/webm'], extensions: '.webm' },
  '.avi': { mime: ['video/avi'], extensions: '.avi' },
  '.mov': { mime: ['video/mov'], extensions: '.mov' },
  '.wmv': { mime: ['video/wmv'], extensions: '.wmv' },
  '.mkv': { mime: ['video/mkv'], extensions: '.mkv' },

  '.mp3': { mime: ['audio/mpeg', 'audio/mp3'], extensions: '.mp3' },
  '.wav': { mime: ['audio/wav'], extensions: '.wav' },
  '.ogg': { mime: ['audio/ogg'], extensions: '.ogg' },
  '.m4a': { mime: ['audio/m4a'], extensions: '.m4a' },
}

export const colors: string[] = ['#547df4', '#f7a85d', '#727272', '#1cae7f', '#9b59b6']