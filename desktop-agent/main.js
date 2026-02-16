const { app, BrowserWindow, Tray, Menu, nativeImage, screen } = require('electron')
const path = require('path')
const { InputServer } = require('./input-server')

let tray = null
let mainWindow = null
let inputServer = null

const AGENT_PORT = 19876

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(1)) : icon)
  updateTrayMenu(false)
  tray.setToolTip('OciannWork Remote Agent')
}

function updateTrayMenu(isControlActive) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'OciannWork Remote Agent',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isControlActive ? 'Remote Control: ACTIVE' : 'Remote Control: Inactive',
      enabled: false,
    },
    {
      label: `Listening on port ${AGENT_PORT}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Stop Remote Control',
      enabled: isControlActive,
      click: () => {
        if (inputServer) {
          inputServer.stopControl()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  if (tray) {
    tray.setContextMenu(contextMenu)
  }
}

function getScreenInfo() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size
  const scaleFactor = primaryDisplay.scaleFactor
  return {
    width,
    height,
    scaleFactor,
  }
}

app.whenReady().then(() => {
  createTray()

  inputServer = new InputServer(AGENT_PORT, {
    getScreenInfo,
    onControlStart: () => updateTrayMenu(true),
    onControlStop: () => updateTrayMenu(false),
  })
  inputServer.start()

  app.on('window-all-closed', (e) => {
    e.preventDefault()
  })
})

app.on('before-quit', () => {
  if (inputServer) {
    inputServer.stop()
  }
})

app.dock && app.dock.hide()
