const WebSocket = require('ws')

let nut = null
try {
  nut = require('@nut-tree-fork/nut-js')
} catch {
  console.warn('nut-js not available - input simulation disabled')
}

class InputServer {
  constructor(port, callbacks) {
    this.port = port
    this.callbacks = callbacks
    this.wss = null
    this.activeClient = null
    this.isControlActive = false
    this.sessionToken = null
  }

  start() {
    this.wss = new WebSocket.Server({
      port: this.port,
      host: '127.0.0.1',
      verifyClient: (info) => {
        const origin = info.origin || info.req.headers.origin || ''
        const remoteAddr = info.req.socket.remoteAddress
        if (remoteAddr !== '127.0.0.1' && remoteAddr !== '::1' && remoteAddr !== '::ffff:127.0.0.1') {
          console.warn(`Rejected connection from ${remoteAddr}`)
          return false
        }
        return true
      },
    })

    this.wss.on('connection', (ws, req) => {
      console.log('[RemoteAgent] Client connected')

      if (this.activeClient) {
        ws.close(4001, 'Another control session is already active')
        return
      }

      this.activeClient = ws

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          this.handleMessage(ws, msg)
        } catch (err) {
          console.error('[RemoteAgent] Invalid message:', err.message)
        }
      })

      ws.on('close', () => {
        console.log('[RemoteAgent] Client disconnected')
        if (this.activeClient === ws) {
          this.activeClient = null
          this.stopControl()
        }
      })

      ws.on('error', (err) => {
        console.error('[RemoteAgent] WebSocket error:', err.message)
      })
    })

    this.wss.on('listening', () => {
      console.log(`[RemoteAgent] Listening on 127.0.0.1:${this.port}`)
    })

    this.wss.on('error', (err) => {
      console.error('[RemoteAgent] Server error:', err.message)
    })
  }

  async handleMessage(ws, msg) {
    switch (msg.type) {
      case 'ping':
        this.send(ws, { type: 'pong' })
        break

      case 'screen-info':
        const screenInfo = this.callbacks.getScreenInfo()
        this.send(ws, { type: 'screen-info', ...screenInfo })
        break

      case 'start-control':
        this.sessionToken = msg.token || null
        this.isControlActive = true
        this.callbacks.onControlStart()
        this.send(ws, { type: 'control-started' })
        console.log('[RemoteAgent] Remote control started')
        break

      case 'stop-control':
        this.stopControl()
        this.send(ws, { type: 'control-stopped' })
        break

      case 'mouse-move':
        await this.handleMouseMove(msg)
        break

      case 'mouse-click':
        await this.handleMouseClick(msg)
        break

      case 'mouse-scroll':
        await this.handleMouseScroll(msg)
        break

      case 'key-press':
        await this.handleKeyPress(msg)
        break

      case 'key-release':
        await this.handleKeyRelease(msg)
        break

      case 'key-type':
        await this.handleKeyType(msg)
        break

      default:
        console.warn(`[RemoteAgent] Unknown message type: ${msg.type}`)
    }
  }

  async handleMouseMove(msg) {
    if (!this.isControlActive || !nut) return
    try {
      await nut.mouse.setPosition({ x: Math.round(msg.x), y: Math.round(msg.y) })
    } catch (err) {
      console.error('[RemoteAgent] Mouse move error:', err.message)
    }
  }

  async handleMouseClick(msg) {
    if (!this.isControlActive || !nut) return
    try {
      const button = this.mapButton(msg.button)
      if (msg.x !== undefined && msg.y !== undefined) {
        await nut.mouse.setPosition({ x: Math.round(msg.x), y: Math.round(msg.y) })
      }
      if (msg.double) {
        await nut.mouse.doubleClick(button)
      } else {
        await nut.mouse.click(button)
      }
    } catch (err) {
      console.error('[RemoteAgent] Mouse click error:', err.message)
    }
  }

  async handleMouseScroll(msg) {
    if (!this.isControlActive || !nut) return
    try {
      const amount = Math.round((msg.deltaY || 0) / 40)
      if (amount > 0) {
        await nut.mouse.scrollDown(Math.abs(amount))
      } else if (amount < 0) {
        await nut.mouse.scrollUp(Math.abs(amount))
      }
    } catch (err) {
      console.error('[RemoteAgent] Mouse scroll error:', err.message)
    }
  }

  async handleKeyPress(msg) {
    if (!this.isControlActive || !nut) return
    try {
      const key = this.mapKey(msg.key)
      if (!key) return

      const modifiers = (msg.modifiers || []).map((m) => this.mapModifier(m)).filter(Boolean)

      if (modifiers.length > 0) {
        await nut.keyboard.pressKey(...modifiers, key)
        await nut.keyboard.releaseKey(...modifiers, key)
      } else {
        await nut.keyboard.pressKey(key)
      }
    } catch (err) {
      console.error('[RemoteAgent] Key press error:', err.message)
    }
  }

  async handleKeyRelease(msg) {
    if (!this.isControlActive || !nut) return
    try {
      const key = this.mapKey(msg.key)
      if (!key) return
      await nut.keyboard.releaseKey(key)
    } catch (err) {
      console.error('[RemoteAgent] Key release error:', err.message)
    }
  }

  async handleKeyType(msg) {
    if (!this.isControlActive || !nut) return
    try {
      if (msg.text) {
        await nut.keyboard.type(msg.text)
      }
    } catch (err) {
      console.error('[RemoteAgent] Key type error:', err.message)
    }
  }

  mapButton(button) {
    if (!nut) return 0
    const buttonMap = {
      left: nut.Button.LEFT,
      right: nut.Button.RIGHT,
      middle: nut.Button.MIDDLE,
    }
    return buttonMap[button] || nut.Button.LEFT
  }

  mapModifier(mod) {
    if (!nut) return null
    const modMap = {
      ctrl: nut.Key.LeftControl,
      control: nut.Key.LeftControl,
      shift: nut.Key.LeftShift,
      alt: nut.Key.LeftAlt,
      meta: nut.Key.LeftSuper,
      command: nut.Key.LeftSuper,
    }
    return modMap[mod.toLowerCase()] || null
  }

  mapKey(keyName) {
    if (!nut) return null
    if (!keyName) return null

    const keyMap = {
      backspace: nut.Key.Backspace,
      tab: nut.Key.Tab,
      enter: nut.Key.Enter,
      escape: nut.Key.Escape,
      space: nut.Key.Space,
      delete: nut.Key.Delete,
      arrowup: nut.Key.Up,
      arrowdown: nut.Key.Down,
      arrowleft: nut.Key.Left,
      arrowright: nut.Key.Right,
      home: nut.Key.Home,
      end: nut.Key.End,
      pageup: nut.Key.PageUp,
      pagedown: nut.Key.PageDown,
      insert: nut.Key.Insert,
      f1: nut.Key.F1,
      f2: nut.Key.F2,
      f3: nut.Key.F3,
      f4: nut.Key.F4,
      f5: nut.Key.F5,
      f6: nut.Key.F6,
      f7: nut.Key.F7,
      f8: nut.Key.F8,
      f9: nut.Key.F9,
      f10: nut.Key.F10,
      f11: nut.Key.F11,
      f12: nut.Key.F12,
      a: nut.Key.A, b: nut.Key.B, c: nut.Key.C, d: nut.Key.D,
      e: nut.Key.E, f: nut.Key.F, g: nut.Key.G, h: nut.Key.H,
      i: nut.Key.I, j: nut.Key.J, k: nut.Key.K, l: nut.Key.L,
      m: nut.Key.M, n: nut.Key.N, o: nut.Key.O, p: nut.Key.P,
      q: nut.Key.Q, r: nut.Key.R, s: nut.Key.S, t: nut.Key.T,
      u: nut.Key.U, v: nut.Key.V, w: nut.Key.W, x: nut.Key.X,
      y: nut.Key.Y, z: nut.Key.Z,
      '0': nut.Key.Num0, '1': nut.Key.Num1, '2': nut.Key.Num2,
      '3': nut.Key.Num3, '4': nut.Key.Num4, '5': nut.Key.Num5,
      '6': nut.Key.Num6, '7': nut.Key.Num7, '8': nut.Key.Num8,
      '9': nut.Key.Num9,
    }

    const lower = keyName.toLowerCase()
    return keyMap[lower] || null
  }

  send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  stopControl() {
    this.isControlActive = false
    this.sessionToken = null
    this.callbacks.onControlStop()
    console.log('[RemoteAgent] Remote control stopped')
  }

  stop() {
    if (this.wss) {
      this.wss.close()
    }
  }
}

module.exports = { InputServer }
