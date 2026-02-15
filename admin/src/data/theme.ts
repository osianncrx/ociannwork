const ConfigDB = {
  settings: {
    layoutType: 'ltr',
    sidebar: {
      type: 'compact-wrapper',
      iconType: 'stroke',
    },
  },
  color: {
    primaryColor: '#2b5f60',
    secondaryColor: '#c06240',
    mixBackgroundLayout: localStorage.getItem('mode') || 'light',
  },
}

export default ConfigDB
