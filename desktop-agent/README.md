# OciannWork Remote Desktop Agent

Lightweight desktop agent that enables remote control during OciannWork video calls.

## Setup

```bash
npm install
npm start
```

## How it works

1. The agent runs in the system tray and listens on `ws://127.0.0.1:19876`
2. When a user shares their screen in an OciannWork video call, the web app connects to the local agent
3. When another user requests remote control and permission is granted, mouse/keyboard events are forwarded to the agent
4. The agent simulates the input using nut.js

## Building Installers

```bash
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
npm run build:all    # All platforms
```

## Security

- Only accepts connections from localhost (127.0.0.1)
- Session tokens for authentication
- User must explicitly grant permission for each remote control session
- Control can be stopped at any time via tray menu or Escape key
