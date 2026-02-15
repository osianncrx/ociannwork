import { io } from 'socket.io-client'

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect: false,
  transports: ['polling'],
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 30000,
  forceNew: false,
  upgrade: true,
  rememberUpgrade: true,
  multiplex: true,
})
