import { toast } from 'react-toastify'
import { ChatType, SOCKET } from '../constants'
import { toaster } from '../utils/custom-functions'
import { NotificationService } from './notification.service'
import { socket } from './socket-setup'
import { stringify } from '../utils'
import { e2eEncryptionService } from './e2e-encryption.service'
import { recordingService } from './recording.service'

export interface CallParticipant {
  userId: string
  socketId: string
  name: string
  avatar?: string
  profile_color: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  stream?: MediaStream | null
  joinedAt?: Date
  isScreenSharing?: boolean
  screenShareStream?: MediaStream
}

export interface RemoteControlState {
  isActive: boolean
  targetUserId: string | null
  controllerUserId: string | null
  isDesktopAgentConnected: boolean
  pendingRequestFrom: string | null
  pendingRequestName: string | null
  screenWidth: number
  screenHeight: number
}

export interface CallState {
  callId: string | null
  isInCall: boolean
  isInitiator: boolean
  callType: 'audio' | 'video'
  chatType: ChatType.DM | ChatType.Channel
  chatId: string | null
  chatName: string | null
  participants: Map<string, CallParticipant>
  localStream: MediaStream | null
  screenShareStream: MediaStream | null
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  callStartTime: Date | null
  individualJoinTime?: Date | null
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'ongoing' | 'missed' | 'no_answer'
  targetBusy: boolean
  remoteControl: RemoteControlState
  waitingIncoming: {
    callId: string
    chatId: string
    chatType: ChatType.DM | ChatType.Channel
    callType: 'audio' | 'video'
    chatName: string
    initiator: {
      userId: string
      name: string
      avatar?: string
      profile_color: string
    }
  } | null
}

const initialRemoteControlState: RemoteControlState = {
  isActive: false,
  targetUserId: null,
  controllerUserId: null,
  isDesktopAgentConnected: false,
  pendingRequestFrom: null,
  pendingRequestName: null,
  screenWidth: 0,
  screenHeight: 0,
}

const initialCallState: CallState = {
  callId: null,
  isInCall: false,
  isInitiator: false,
  callType: 'audio',
  chatType: ChatType.DM,
  chatId: null,
  chatName: null,
  participants: new Map(),
  localStream: null,
  screenShareStream: null,
  isVideoEnabled: false,
  isAudioEnabled: true,
  isScreenSharing: false,
  callStartTime: null,
  callStatus: 'idle',
  targetBusy: false,
  remoteControl: { ...initialRemoteControlState },
  waitingIncoming: null,
}

class WebRTCService {
  private callState: CallState = { ...initialCallState }
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private pendingIceCandidates: Map<string, RTCIceCandidate[]> = new Map()
  private stateChangeCallbacks: Set<(state: CallState) => void> = new Set()
  private participantUpdateCallbacks: Set<(participants: Map<string, CallParticipant>) => void> = new Set()
  private declineNotifications: Set<string> = new Set()
  private peerConnectionStates: Map<string, RTCPeerConnectionState> = new Map()
  private negotiationLocks: Map<string, boolean> = new Map()
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: [
          'turn:95.216.38.12:3478',
          'turn:95.216.38.12:3478?transport=tcp',
          'turns:ociannwork.com:5349',
        ],
        username: 'ociannwork',
        credential: 'TurnSecure2026!',
      },
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 10,
  }

  private ringingTimer?: NodeJS.Timeout
  private callingTimer?: NodeJS.Timeout
  private mediaPromise?: Promise<MediaStream | null>
  private checkConnectionInterval?: NodeJS.Timeout
  private e2eEnabled: boolean = true // Enable e2e encryption by default
  private callEncryptionKeyId: string | null = null
  private keyExchangeCompleted: Map<string, boolean> = new Map()
  private recordingStarted = false
  private currentTeamId: string | number | null = null

  // Remote control
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private desktopAgentWs: WebSocket | null = null
  private remoteControlCallbacks: Set<(state: RemoteControlState) => void> = new Set()
  private static readonly AGENT_WS_URL = 'ws://127.0.0.1:19876'

  constructor() {
    this.setupSocketListeners()
    this.checkConnectionInterval = setInterval(() => this.checkPeerConnections(), 5000)
  }

  /**
   * Enable or disable e2e encryption
   */
  setE2EEnabled(enabled: boolean): void {
    this.e2eEnabled = enabled && e2eEncryptionService.isSupported()
    if (!this.e2eEnabled && enabled) {
      this.e2eEnabled = false
    }
  }

  /**
   * Check if e2e encryption is enabled and supported
   */
  isE2EEnabled(): boolean {
    return this.e2eEnabled && e2eEncryptionService.isSupported()
  }

  /**
   * Get detailed e2e encryption status
   */
  getE2EStatus(): {
    enabled: boolean
    supported: boolean
    active: boolean
    keyId: string | null
    keyExchangeCompleted: number
  } {
    return {
      enabled: this.e2eEnabled,
      supported: e2eEncryptionService.isSupported(),
      active: this.isE2EEnabled() && this.callEncryptionKeyId !== null,
      keyId: this.callEncryptionKeyId,
      keyExchangeCompleted: this.keyExchangeCompleted.size,
    }
  }

  // Public API
  onStateChange(callback: (state: CallState) => void) {
    this.stateChangeCallbacks.add(callback)
    return () => this.stateChangeCallbacks.delete(callback)
  }

  onParticipantUpdate(callback: (participants: Map<string, CallParticipant>) => void) {
    this.participantUpdateCallbacks.add(callback)
    return () => this.participantUpdateCallbacks.delete(callback)
  }

  getCallState(): CallState {
    return { ...this.callState }
  }

  getRemoteControlState(): RemoteControlState {
    return { ...this.callState.remoteControl }
  }

  onRemoteControlChange(callback: (state: RemoteControlState) => void) {
    this.remoteControlCallbacks.add(callback)
    return () => this.remoteControlCallbacks.delete(callback)
  }

  private notifyRemoteControlChange() {
    this.remoteControlCallbacks.forEach((cb) => cb({ ...this.callState.remoteControl }))
  }

  isInCall(): boolean {
    return this.callState.isInCall
  }

  attemptRejoin(currentUser: any) {
    const stored = localStorage.getItem('activeCall')
    if (stored) {
      try {
        const active = JSON.parse(stored)
        if (active.callId && active.chatId) {
          socket.emit(SOCKET.Emitters.Rejoin_Call, {
            callId: active.callId,
            channelId: active.chatId,
            user: {
              userId: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar,
              profile_color: currentUser.profile_color,
              callType: active.callType,
            },
          })
        }
      } catch (e) {
        console.error('Error attempting rejoin:', e)
      }
    }
  }

  async initiateCall(
    chatId: string,
    chatName: string,
    chatType: ChatType.DM | ChatType.Channel,
    callType: 'audio' | 'video',
    currentUser: any,
    teamId?: string | number,
  ): Promise<boolean> {
    if (this.callState.isInCall || this.callState.callStatus !== 'idle') {
      console.warn('Already in a call or call in progress')
      toast.warn('You are already in a call')
      return false
    }
    try {
      const requestedVideo = callType === 'video'
      const stream = await this.getUserMedia(requestedVideo)
      if (!stream) return false
      const callId = this.generateCallId()
      this.localStream = stream

      const hasVideo = stream.getVideoTracks().length > 0
      const actualVideoEnabled = requestedVideo && hasVideo
      const finalCallType = callType

      this.callState = {
        ...initialCallState,
        callId,
        isInCall: true,
        isInitiator: true,
        callType: finalCallType,
        chatType,
        chatId,
        chatName,
        localStream: stream,
        isVideoEnabled: actualVideoEnabled,
        isAudioEnabled: true,
        callStartTime: null,
        individualJoinTime: new Date(),
        callStatus: 'calling',
        participants: new Map(),
        targetBusy: false,
      }
      this.callState.participants.set(currentUser.id, {
        userId: currentUser.id,
        socketId: socket.id!,
        name: currentUser.name,
        avatar: currentUser.avatar,
        profile_color: currentUser.profile_color,
        isVideoEnabled: actualVideoEnabled,
        isAudioEnabled: this.callState.isAudioEnabled,
        stream,
        joinedAt: new Date(),
      })
      if (this.callState.callId) {
        socket.emit(SOCKET.Emitters.Initiate_Call, {
          callId: this.callState.callId,
          chatId,
          chatType,
          callType: finalCallType,
          chatName,
          initiator: {
            userId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            profile_color: currentUser.profile_color,
            team_id: teamId,
            isAudioEnabled: this.callState.isAudioEnabled,
            isVideoEnabled: actualVideoEnabled,
          },
        })
      }
      if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.enabled = true)
      }

      this.currentTeamId = teamId || null

      // Generate encryption key for the call (initiator only)
      // Key will be sent to participants when they accept/join
      if (this.isE2EEnabled()) {
        await this.generateAndExchangeKey()
      }

      NotificationService.startOutgoingCallRingtone()

      if (this.callingTimer) clearTimeout(this.callingTimer)
      this.callingTimer = setTimeout(() => {
        if (this.callState.callStatus === 'calling' && this.callState.callId) {
          this.endCall()
        }
      }, 20000)
      this.saveActiveCall()
      this.notifyStateChange()
      return true
    } catch (error) {
      console.error('Error initiating call:', error)
      await this.endCall()
      return false
    }
  }

  async acceptCall(callId: string, currentUser: any): Promise<boolean> {
    if (this.callState.isInCall && this.callState.callStatus !== 'ringing') {
      console.warn('Already in a call')
      return false
    }

    try {
      NotificationService.stopCallSound()
      const requestedVideo = this.callState.callType === 'video'
      const stream = await this.getUserMedia(requestedVideo)
      if (!stream) return false

      this.localStream = stream
      const hasVideo = stream.getVideoTracks().length > 0
      const actualVideoEnabled = requestedVideo && hasVideo

      this.callState = {
        ...this.callState,
        isInCall: true,
        isInitiator: false,
        localStream: stream,
        isVideoEnabled: actualVideoEnabled,
        isAudioEnabled: true,
        callStartTime: new Date(),
        individualJoinTime: new Date(),
        callStatus: 'connected',
        callType: this.callState.callType,
      }

      this.callState.participants.set(currentUser.id, {
        userId: currentUser.id,
        socketId: socket.id!,
        name: currentUser.name,
        avatar: currentUser.avatar,
        profile_color: currentUser.profile_color,
        isVideoEnabled: actualVideoEnabled,
        isAudioEnabled: this.callState.isAudioEnabled,
        stream,
        joinedAt: new Date(),
      })

      if (this.callState.callId) {
        socket.emit(SOCKET.Emitters.Accept_Call, {
          callId: this.callState.callId,
          user: {
            userId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            profile_color: currentUser.profile_color,
            isAudioEnabled: this.callState.isAudioEnabled,
            isVideoEnabled: actualVideoEnabled,
          },
        })
      }

      if (this.ringingTimer) {
        clearTimeout(this.ringingTimer)
        this.ringingTimer = undefined
      }

      // Note: Receiver waits for initiator's key - don't generate own key
      // Key will be received via socket when initiator sends it

      // Auto-start recording when accepting a call
      if (!this.recordingStarted && this.localStream) {
        this.startAutoRecording()
      }

      this.saveActiveCall()
      this.notifyStateChange()
      return true
    } catch (error) {
      console.error('Error accepting call:', error)
      await this.declineCall(callId)
      return false
    }
  }

  async updateCallStateForRejoin(callId: string, user: any, participants: any[], chatName?: string) {
    await this.cleanupPeerConnections()

    const requestedVideo = user.callType === 'video'

    this.callState = {
      ...initialCallState,
      callId,
      chatId: user.channelId,
      chatType: ChatType.Channel,
      callType: user.callType || 'audio',
      chatName: chatName || user.chatName || '',
      isInCall: true,
      isInitiator: false,
      localStream: null,
      isVideoEnabled: false,
      isAudioEnabled: true,
      callStartTime: new Date(user.callStartTime),
      individualJoinTime: new Date(),
      callStatus: 'connected',
      participants: new Map(),
    }

    participants.forEach((p: any) => {
      this.callState.participants.set(p.userId, {
        userId: p.userId,
        socketId: p.socketId || '',
        name: p.name,
        avatar: p.avatar,
        profile_color: p.profile_color,
        isVideoEnabled: p.isVideoEnabled || false,
        isAudioEnabled: p.isAudioEnabled !== undefined ? p.isAudioEnabled : true,
        stream: null,
        joinedAt: new Date(p.joinedAt),
        isScreenSharing: p.isScreenSharing || false,
      })
    })

    this.callState.participants.set(user.userId, {
      userId: user.userId,
      socketId: socket.id!,
      name: user.name,
      avatar: user.avatar,
      profile_color: user.profile_color,
      isVideoEnabled: false,
      isAudioEnabled: this.callState.isAudioEnabled,
      stream: null,
      joinedAt: new Date(),
    })

    this.notifyStateChange()
    this.notifyParticipantUpdate()

    this.mediaPromise = this.getUserMedia(requestedVideo)
    this.mediaPromise
      .then((stream) => {
        if (stream) {
          this.localStream = stream
          this.callState.localStream = stream

          const hasVideo = stream.getVideoTracks().length > 0
          const actualVideoEnabled = requestedVideo && hasVideo

          this.callState.isVideoEnabled = actualVideoEnabled

          const selfParticipant = this.callState.participants.get(user.userId)
          if (selfParticipant) {
            selfParticipant.stream = stream
            selfParticipant.isVideoEnabled = actualVideoEnabled
            this.callState.participants.set(user.userId, selfParticipant)
          }

          this.saveActiveCall()
          this.notifyStateChange()
          this.notifyParticipantUpdate()
        } else {
          this.localStream = null
          this.callState.localStream = null
          this.callState.isVideoEnabled = false
        }
        this.mediaPromise = undefined
      })
      .catch((error) => {
        console.error('Error getting media for rejoin:', error)
        this.localStream = null
        this.callState.localStream = null
        this.callState.isVideoEnabled = false
        this.mediaPromise = undefined
      })
  }

  async acceptWaitingCall(currentUser: any): Promise<boolean> {
    if (!this.callState.waitingIncoming) return false
    const incoming = this.callState.waitingIncoming
    this.callState.waitingIncoming = null
    NotificationService.stopWaitingCallNotification()
    this.notifyStateChange()
    await this.endCall()
    this.callState = {
      ...initialCallState,
      callId: incoming.callId,
      chatId: incoming.chatId,
      chatType: incoming.chatType,
      callType: incoming.callType,
      chatName: incoming.chatName,
      callStatus: 'ringing',
      isVideoEnabled: incoming.callType === 'video',
      participants: new Map(),
      targetBusy: false,
      waitingIncoming: null,
    }
    this.callState.participants.set(incoming.initiator.userId, {
      userId: incoming.initiator.userId,
      socketId: '',
      name: incoming.initiator.name,
      avatar: incoming.initiator.avatar,
      profile_color: incoming.initiator.profile_color,
      isVideoEnabled: incoming.callType === 'video',
      isAudioEnabled: true,
    })

    this.notifyParticipantUpdate()
    return await this.acceptCall(incoming.callId, currentUser)
  }

  declineWaitingCall() {
    if (this.callState.waitingIncoming) {
      if (this.callState.waitingIncoming.callId) {
        socket.emit(SOCKET.Emitters.Decline_Call, { callId: this.callState.waitingIncoming.callId })
      }
      NotificationService.stopCallSound()
      this.callState.waitingIncoming = null
      this.notifyStateChange()
    }
  }

  private async cleanupMediaDevices(): Promise<void> {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          if (track.readyState === 'live') {
            track.stop()
          }
        })
      }
      this.localStream = null
      this.callState.localStream = null

      if (this.callState.screenShareStream) {
        this.callState.screenShareStream.getTracks().forEach((track) => {
          if (track.readyState === 'live') {
            track.stop()
          }
        })
        this.callState.screenShareStream = null
      }
    } catch (error) {
      console.error('Error cleaning up media devices:', error)
    }
  }

  private async cleanupPeerConnections(): Promise<void> {
    this.peerConnectionStates.clear()
    this.negotiationLocks.clear()

    this.peerConnections.forEach((pc) => {
      try {
        pc.close()
      } catch (error) {
        console.error('Error closing peer connection:', error)
      }
    })

    this.peerConnections.clear()
    this.pendingIceCandidates.clear()

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop()
        }
      })
      this.localStream = null
    }
  }

  private checkPeerConnections() {
    this.peerConnections.forEach((pc, userId) => {
      if (pc.connectionState === 'disconnected') {
        console.warn(`Reconnecting peer ${userId}`)
        pc.restartIce()
      }
    })
  }

  private startAutoRecording(): void {
    if (this.recordingStarted || !this.callState.callId) return
    try {
      const success = recordingService.startRecording(this.localStream, {
        callId: this.callState.callId,
        callType: this.callState.callType,
        chatType: this.callState.chatType === ChatType.DM ? 'dm' : 'channel',
        chatId: this.callState.chatId || '',
        chatName: this.callState.chatName || '',
        teamId: this.currentTeamId || '',
      })
      if (success) {
        this.recordingStarted = true
      }
    } catch (error) {
      console.error('Error starting auto-recording:', error)
    }
  }

  addRemoteStreamToRecording(userId: string, stream: MediaStream): void {
    if (this.recordingStarted) {
      recordingService.addRemoteStream(userId, stream)
    }
  }

  async endCall(): Promise<void> {
  // Stop remote control before cleanup
  this.cleanupRemoteControl()

  // Stop recording before cleanup
  if (this.recordingStarted) {
    recordingService.stopRecording()
    this.recordingStarted = false
  }

  if (this.callingTimer) {
    clearTimeout(this.callingTimer)
    this.callingTimer = undefined
  }
  if (this.ringingTimer) {
    clearTimeout(this.ringingTimer)
    this.ringingTimer = undefined
  }
  NotificationService.stopCallSound()
  NotificationService.stopOutgoingCallRingtone()

  if (this.callState.callId) {
    let duration = 0;
    if (this.callState.callStartTime) {
      duration = Math.floor((new Date().getTime() - this.callState.callStartTime.getTime()) / 1000);
    }
    const endedCalls = JSON.parse(localStorage.getItem('endedCalls') || '{}');
    endedCalls[this.callState.callId] = duration;
    localStorage.setItem('endedCalls', JSON.stringify(endedCalls));

    socket.emit(SOCKET.Emitters.End_Call, {
      callId: this.callState.callId,
      isInitiator: this.callState.isInitiator,
      chatType: this.callState.chatType,
    })
  }

  await this.cleanupPeerConnections()

  if (this.mediaPromise) {
    this.mediaPromise
      .then((stream) => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      })
      .catch(() => {})
    this.mediaPromise = undefined
  }

  if (this.checkConnectionInterval) {
    clearInterval(this.checkConnectionInterval)
  }

  await this.cleanupMediaDevices()
  localStorage.removeItem('activeCall')

  // Clean up encryption keys
  if (this.isE2EEnabled()) {
    e2eEncryptionService.clearKeys()
    this.callEncryptionKeyId = null
    this.keyExchangeCompleted.clear()
  }

  this.callState = { ...initialCallState }
  this.notifyStateChange()
  this.notifyParticipantUpdate()
}

  async declineCall(callId: string): Promise<void> {
    if (this.ringingTimer) {
      clearTimeout(this.ringingTimer)
      this.ringingTimer = undefined
    }

    NotificationService.stopCallSound()
    NotificationService.stopOutgoingCallRingtone()
    socket.emit(SOCKET.Emitters.Decline_Call, { callId })

    this.callState = { ...initialCallState }
    this.notifyStateChange()
  }

  async toggleVideo(): Promise<boolean> {
    if (!this.localStream || !this.callState.isInCall) return false

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      this.callState.isVideoEnabled = videoTrack.enabled

      this.callState.participants.forEach((p, userId) => {
        if (p.socketId === socket.id) {
          p.isVideoEnabled = videoTrack.enabled
          this.callState.participants.set(userId, p)
        }
      })

      if (this.callState.callId) {
        socket.emit(SOCKET.Emitters.Toggle_Video, {
          callId: this.callState.callId,
          isVideoEnabled: videoTrack.enabled,
        })
      }

      this.notifyStateChange()
      this.notifyParticipantUpdate()
      return videoTrack.enabled
    }
    return false
  }

  async toggleAudio(): Promise<boolean> {
    if (!this.localStream || !this.callState.isInCall) return false

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      this.callState.isAudioEnabled = audioTrack.enabled

      this.callState.participants.forEach((p, userId) => {
        if (p.socketId === socket.id) {
          p.isAudioEnabled = audioTrack.enabled
          this.callState.participants.set(userId, p)
        }
      })

      if (this.callState.callId) {
        socket.emit(SOCKET.Emitters.Toggle_Audio, {
          callId: this.callState.callId,
          isAudioEnabled: audioTrack.enabled,
        })
      }

      this.notifyStateChange()
      this.notifyParticipantUpdate()
      return audioTrack.enabled
    }
    return false
  }

  async startScreenShare(): Promise<boolean> {
    if (!this.callState.isInCall || this.callState.isScreenSharing) return false

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      const videoTrack = screenStream.getVideoTracks()[0]

      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare(this.localStream).catch(error => console.error('Screen share end error:', error))
        }
        const trackPromises = Array.from(this.peerConnections.entries()).map(async ([userId, pc]) => {
          try {
            const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
            if (videoSender && videoSender.track) {
              await videoSender.replaceTrack(videoTrack)
            } else {
              pc.addTrack(videoTrack, screenStream)
            }

            if (this.localStream) {
              const audioTrack = this.localStream.getAudioTracks()[0]
              if (audioTrack) {
                const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio')
                if (!audioSender) {
                  pc.addTrack(audioTrack, this.localStream)
                } else if (audioSender.track !== audioTrack) {
                  await audioSender.replaceTrack(audioTrack)
                }
              }
            }
          } catch (error) {
            console.error(`Error handling tracks for ${userId}:`, error)
          }
        })

        await Promise.all(trackPromises)

        videoTrack.onended = () => {
          this.stopScreenShare(this.localStream)
        }

        this.callState.screenShareStream = screenStream
        this.callState.isScreenSharing = true
        this.callState.isVideoEnabled = true
        this.callState.participants.forEach((participant, userId) => {
          if (participant.socketId === socket.id) {
            participant.isVideoEnabled = true
            participant.isScreenSharing = true
            this.callState.participants.set(userId, participant)
          }
        })

        // Notify recording service about screen share
        if (this.recordingStarted) {
          recordingService.setScreenShareStream('local', screenStream)
        }

        if (this.callState.callId) {
          socket.emit('start-screen-share', {
            callId: this.callState.callId,
          })

          socket.emit(SOCKET.Emitters.Toggle_Video, {
            callId: this.callState.callId,
            isVideoEnabled: true,
          })
        }

        this.notifyStateChange()
        this.notifyParticipantUpdate()
        return true
      }
    } catch (error) {
      console.error('Error starting screen share:', error)
      toaster('error', 'Failed to start screen sharing.')
    }
    return false
  }

  async stopScreenShare(originalStream?: MediaStream | null): Promise<void> {
    if (!this.callState.isScreenSharing) return

    // Stop remote control when screen share stops
    if (this.callState.remoteControl.isActive) {
      this.stopRemoteControl()
    }

    try {
      if (this.callState.screenShareStream) {
        this.callState.screenShareStream.getTracks().forEach((track) => track.stop())
        this.callState.screenShareStream = null
      }
      this.callState.isScreenSharing = false

      // Notify recording service that screen share stopped
      if (this.recordingStarted) {
        recordingService.setScreenShareStream('local', null)
      }

      if (this.callState.callId) {
        socket.emit('stop-screen-share', {
          callId: this.callState.callId,
        })
      }

      let cameraStream: MediaStream | null = null

      if (originalStream) {
        cameraStream = originalStream
      } else {
        try {
          cameraStream = await this.getUserMedia(this.callState.callType === 'video')
        } catch (error) {
          console.warn('Could not get camera stream after stopping screen share:', error)
        }
      }

      const replacePromises = Array.from(this.peerConnections.entries()).map(async ([userId, pc]) => {
        try {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
          if (sender) {
            if (cameraStream) {
              const videoTrack = cameraStream.getVideoTracks()[0]
              if (videoTrack) {
                await sender.replaceTrack(videoTrack)
              } else {
                await sender.replaceTrack(null)
              }
            } else {
              await sender.replaceTrack(null)
            }
          }
        } catch (error) {
          console.error(`Error replacing track for ${userId}:`, error)
        }
      })

      await Promise.all(replacePromises)

      if (cameraStream) {
        if (!originalStream) {
          this.localStream = cameraStream
          this.callState.localStream = cameraStream
        }

        const hasVideo = cameraStream.getVideoTracks().length > 0
        this.callState.isVideoEnabled = hasVideo && this.callState.callType === 'video'
        this.callState.participants.forEach((participant, userId) => {
          if (participant.socketId === socket.id) {
            participant.isVideoEnabled = this.callState.isVideoEnabled
            this.callState.participants.set(userId, participant)
          }
        })
      } else {
        this.callState.isVideoEnabled = false
        this.callState.participants.forEach((participant, userId) => {
          if (participant.socketId === socket.id) {
            participant.isVideoEnabled = false
            this.callState.participants.set(userId, participant)
          }
        })
      }

      if (this.callState.callId) {
        socket.emit(SOCKET.Emitters.Toggle_Video, {
          callId: this.callState.callId,
          isVideoEnabled: this.callState.isVideoEnabled,
        })
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      this.notifyStateChange()
      this.notifyParticipantUpdate()
    } catch (error) {
      console.error('Error stopping screen share:', error)
      this.callState.isScreenSharing = false
      this.notifyStateChange()
    }
  }

  // ============================================================
  // REMOTE CONTROL METHODS
  // ============================================================

  async requestRemoteControl(targetUserId: string): Promise<void> {
    if (!this.callState.isInCall || !this.callState.callId) return
    socket.emit('request-remote-control', {
      callId: this.callState.callId,
      targetUserId,
    })
  }

  async acceptRemoteControl(requesterId: string): Promise<void> {
    if (!this.callState.isInCall || !this.callState.callId) return

    const agentConnected = await this.connectToDesktopAgent()
    if (!agentConnected) {
      toaster('error', 'Desktop agent not running. Install and start the OciannWork Remote Agent.')
      this.denyRemoteControl(requesterId)
      return
    }

    socket.emit('accept-remote-control', {
      callId: this.callState.callId,
      requesterId,
    })

    this.callState.remoteControl = {
      ...this.callState.remoteControl,
      isActive: true,
      controllerUserId: requesterId,
      targetUserId: null,
      pendingRequestFrom: null,
      pendingRequestName: null,
    }

    const dc = this.dataChannels.get(requesterId)
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({
        type: 'rc-agent-ready',
        screenWidth: this.callState.remoteControl.screenWidth,
        screenHeight: this.callState.remoteControl.screenHeight,
      }))
    }

    this.notifyStateChange()
    this.notifyRemoteControlChange()
  }

  denyRemoteControl(requesterId: string): void {
    if (!this.callState.callId) return
    socket.emit('deny-remote-control', {
      callId: this.callState.callId,
      requesterId,
    })
    this.callState.remoteControl.pendingRequestFrom = null
    this.callState.remoteControl.pendingRequestName = null
    this.notifyStateChange()
    this.notifyRemoteControlChange()
  }

  stopRemoteControl(): void {
    if (!this.callState.callId) return

    const wasTarget = this.callState.remoteControl.controllerUserId !== null

    socket.emit('stop-remote-control', {
      callId: this.callState.callId,
    })

    if (wasTarget) {
      this.disconnectDesktopAgent()
    }

    this.callState.remoteControl = { ...initialRemoteControlState }
    this.notifyStateChange()
    this.notifyRemoteControlChange()
  }

  sendInputEvent(event: Record<string, unknown>): void {
    const targetUserId = this.callState.remoteControl.targetUserId
    if (!targetUserId || !this.callState.remoteControl.isActive) return

    const dc = this.dataChannels.get(targetUserId)
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({ type: 'rc-input', ...event }))
    }
  }

  private handleDataChannelMessage(_fromUserId: string, data: string): void {
    try {
      const msg = JSON.parse(data)

      switch (msg.type) {
        case 'rc-agent-ready':
          this.callState.remoteControl.screenWidth = msg.screenWidth || 1920
          this.callState.remoteControl.screenHeight = msg.screenHeight || 1080
          this.callState.remoteControl.isActive = true
          this.notifyStateChange()
          this.notifyRemoteControlChange()
          break

        case 'rc-input':
          this.forwardInputToAgent(msg)
          break

        case 'rc-stopped':
          this.callState.remoteControl = { ...initialRemoteControlState }
          this.notifyStateChange()
          this.notifyRemoteControlChange()
          toaster('info', 'Remote control session ended')
          break
      }
    } catch (err) {
      console.error('[RC] Error parsing data channel message:', err)
    }
  }

  private async connectToDesktopAgent(): Promise<boolean> {
    if (this.desktopAgentWs && this.desktopAgentWs.readyState === WebSocket.OPEN) {
      return true
    }

    return new Promise<boolean>((resolve) => {
      try {
        const ws = new WebSocket(WebRTCService.AGENT_WS_URL)
        const timeout = setTimeout(() => {
          ws.close()
          resolve(false)
        }, 3000)

        ws.onopen = () => {
          clearTimeout(timeout)
          this.desktopAgentWs = ws
          this.callState.remoteControl.isDesktopAgentConnected = true

          ws.send(JSON.stringify({ type: 'screen-info' }))
          ws.send(JSON.stringify({ type: 'start-control' }))

          this.notifyRemoteControlChange()
          resolve(true)
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'screen-info') {
              this.callState.remoteControl.screenWidth = msg.width || 1920
              this.callState.remoteControl.screenHeight = msg.height || 1080
              this.notifyRemoteControlChange()
            }
          } catch {
            // ignore parse errors
          }
        }

        ws.onclose = () => {
          this.desktopAgentWs = null
          this.callState.remoteControl.isDesktopAgentConnected = false
          this.notifyRemoteControlChange()
        }

        ws.onerror = () => {
          clearTimeout(timeout)
          this.callState.remoteControl.isDesktopAgentConnected = false
          this.notifyRemoteControlChange()
          resolve(false)
        }
      } catch {
        resolve(false)
      }
    })
  }

  private disconnectDesktopAgent(): void {
    if (this.desktopAgentWs) {
      try {
        this.desktopAgentWs.send(JSON.stringify({ type: 'stop-control' }))
        this.desktopAgentWs.close()
      } catch {
        // ignore close errors
      }
      this.desktopAgentWs = null
      this.callState.remoteControl.isDesktopAgentConnected = false
    }
  }

  private forwardInputToAgent(msg: Record<string, unknown>): void {
    if (!this.desktopAgentWs || this.desktopAgentWs.readyState !== WebSocket.OPEN) return
    if (!this.callState.remoteControl.isActive) return

    const { type: _rcType, ...inputData } = msg
    this.desktopAgentWs.send(JSON.stringify(inputData))
  }

  async checkDesktopAgentAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        const ws = new WebSocket(WebRTCService.AGENT_WS_URL)
        const timeout = setTimeout(() => {
          ws.close()
          resolve(false)
        }, 2000)

        ws.onopen = () => {
          clearTimeout(timeout)
          ws.send(JSON.stringify({ type: 'ping' }))
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'pong') {
              ws.close()
              resolve(true)
            }
          } catch {
            ws.close()
            resolve(false)
          }
        }

        ws.onerror = () => {
          clearTimeout(timeout)
          resolve(false)
        }
      } catch {
        resolve(false)
      }
    })
  }

  private cleanupRemoteControl(): void {
    if (this.callState.remoteControl.isActive) {
      const controllerUserId = this.callState.remoteControl.controllerUserId
      if (controllerUserId) {
        const dc = this.dataChannels.get(controllerUserId)
        if (dc && dc.readyState === 'open') {
          dc.send(JSON.stringify({ type: 'rc-stopped' }))
        }
      }
      this.disconnectDesktopAgent()
    }

    this.dataChannels.forEach((dc) => {
      try { dc.close() } catch { /* ignore */ }
    })
    this.dataChannels.clear()
    this.callState.remoteControl = { ...initialRemoteControlState }
  }

  private async getUserMedia(includeVideo: boolean): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: includeVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      return stream
    } catch (error: any) {
      if (includeVideo) {
        try {
          const audioOnlyConstraints: MediaStreamConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          }
          const audioStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints)
          return audioStream
        } catch (audioError: any) {
          console.error('Audio access also failed:', audioError)
          toaster('error', 'Microphone access denied. Cannot join call.')
          return null
        }
      } else {
        try {
          const fallbackConstraints: MediaStreamConstraints = {
            audio: true,
            video: false,
          }
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
          return stream
        } catch (fallbackError) {
          console.error('Fallback getUserMedia also failed:', fallbackError)
          toaster('error', 'Microphone access denied. Cannot join call.')
          return null
        }
      }
    }
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    const existingPc = this.peerConnections.get(userId)
    if (existingPc && existingPc.connectionState !== 'closed') {
      return existingPc
    }

    const pc = new RTCPeerConnection(this.rtcConfiguration)
    this.peerConnectionStates.set(userId, pc.connectionState)
    this.negotiationLocks.set(userId, false)

      // Setup ontrack handler
      pc.ontrack = (event: RTCTrackEvent) => {
        const [remoteStream] = event.streams
        const participant = this.callState.participants.get(userId)
        if (participant) {
          participant.stream = remoteStream
          this.callState.participants.set(userId, participant)
          this.notifyParticipantUpdate()
          this.notifyStateChange()
        }

        // Add remote stream to recording
        if (remoteStream && this.recordingStarted) {
          this.addRemoteStreamToRecording(userId, remoteStream)
        }

        // Note: Decryption setup is handled in setupEncryptionForPeerConnection
        // which is called after peer connection is created and when keys are received
        // This prevents duplicate setup attempts
      }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.callState.callId) {
        socket.emit(SOCKET.Emitters.Ice_Candidate, {
          callId: this.callState.callId,
          targetUserId: userId,
          candidate: event.candidate,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      this.peerConnectionStates.set(userId, state)

      if (state === 'failed') {
        try {
          pc.restartIce()
        } catch (e) {
          console.warn('restartIce failed', e)
        }
      }

      if (state === 'disconnected' || state === 'failed') {
        console.warn(`Peer ${userId} ${state}, attempting restart`)
        try {
          pc.restartIce()
        } catch (e) {
          console.error('ICE restart failed:', e)
          pc.close()
          this.createPeerConnection(userId)
        }
      }

      if (state === 'closed') {
        this.peerConnections.delete(userId)
        this.peerConnectionStates.delete(userId)
        this.negotiationLocks.delete(userId)
      }
    }

    pc.onnegotiationneeded = async () => {
      if (this.negotiationLocks.get(userId)) {
        return
      }

      this.negotiationLocks.set(userId, true)

      try {
        if (pc.signalingState !== 'stable') {
          return
        }

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.callState.callType === 'video',
        })

        await pc.setLocalDescription(offer)

        if (this.callState.callId) {
          socket.emit(SOCKET.Emitters.Webrtc_Offer, {
            callId: this.callState.callId,
            targetUserId: userId,
            offer,
          })
        }
      } catch (error) {
        console.error(`Negotiation error for ${userId}:`, error)
      } finally {
        this.negotiationLocks.set(userId, false)
      }
    }

    if (!this.localStream && this.mediaPromise) {
      try {
        const stream = await this.mediaPromise
        if (stream) {
          this.localStream = stream
        } else {
          console.error('Failed to get local stream for peer connection')
        }
      } catch (error) {
        console.error('Error waiting for media promise:', error)
      }
    }

    if (this.localStream || this.callState.screenShareStream) {
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, this.localStream!)
        })
      }

      let videoTrack = null
      let videoStream = null
      if (this.callState.isScreenSharing && this.callState.screenShareStream) {
        videoTrack = this.callState.screenShareStream.getVideoTracks()[0]
        videoStream = this.callState.screenShareStream
      } else if (this.localStream) {
        videoTrack = this.localStream.getVideoTracks()[0]
        videoStream = this.localStream
      }

      if (videoTrack && videoStream) {
        pc.addTrack(videoTrack, videoStream)
      }

      if (this.callState.isScreenSharing && this.callState.screenShareStream) {
        this.callState.screenShareStream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, this.callState.screenShareStream!)
        })
      }
    } else {
      console.warn('No local stream available when creating peer connection')
    }

    // Setup e2e encryption if enabled
    if (this.isE2EEnabled() && this.callEncryptionKeyId) {
      this.setupEncryptionForPeerConnection(pc, userId)
    }

    // Setup data channel for remote control
    const dc = pc.createDataChannel('remote-control', {
      ordered: true,
      maxRetransmits: 3,
    })
    dc.onopen = () => console.log(`[RC] DataChannel opened with ${userId}`)
    dc.onclose = () => {
      console.log(`[RC] DataChannel closed with ${userId}`)
      this.dataChannels.delete(userId)
    }
    dc.onmessage = (event) => this.handleDataChannelMessage(userId, event.data)
    this.dataChannels.set(userId, dc)

    pc.ondatachannel = (event) => {
      const incomingDc = event.channel
      if (incomingDc.label === 'remote-control') {
        incomingDc.onopen = () => console.log(`[RC] Incoming DataChannel opened from ${userId}`)
        incomingDc.onclose = () => {
          console.log(`[RC] Incoming DataChannel closed from ${userId}`)
          this.dataChannels.delete(userId)
        }
        incomingDc.onmessage = (evt) => this.handleDataChannelMessage(userId, evt.data)
        this.dataChannels.set(userId, incomingDc)
      }
    }

    this.peerConnections.set(userId, pc)
    this.syncCurrentStateWithNewParticipant(userId)

    return pc
  }

  /**
   * Setup encryption for a peer connection
   */
  private async setupEncryptionForPeerConnection(pc: RTCPeerConnection, userId: string): Promise<void> {
    if (!this.isE2EEnabled()) {
      return
    }

    // Wait a bit for key exchange to complete if we're waiting for a key
    if (!this.callEncryptionKeyId) {
      return
    }

    try {
      // Setup encryption for all senders (we have the key)
      const senderPromises = pc.getSenders().map(async (sender) => {
        if (sender.track) {
          try {
            await e2eEncryptionService.setupEncryptionForSender(sender, this.callEncryptionKeyId || undefined)
          } catch (error) {
            console.error(`Error setting up encryption for sender ${userId}:`, error)
          }
        }
      })
      await Promise.all(senderPromises)

      // Setup decryption for all receivers
      // Note: Decryption will handle missing keys gracefully
      const receiverPromises = pc.getReceivers().map(async (receiver) => {
        if (receiver.track) {
          try {
            await e2eEncryptionService.setupDecryptionForReceiver(receiver)
          } catch (error) {
            console.error(`Error setting up decryption for receiver ${userId}:`, error)
          }
        }
      })
      await Promise.all(receiverPromises)
    } catch (error) {
      console.error(`Error setting up encryption for peer ${userId}:`, error)
    }
  }

  /**
   * Generate and exchange encryption key for a call
   */
  private async generateAndExchangeKey(targetUserId?: string): Promise<void> {
    if (!this.isE2EEnabled()) {
      return
    }

    try {
      const encryptionKey = await e2eEncryptionService.generateKey()
      this.callEncryptionKeyId = encryptionKey.keyId

      // Export key for exchange
      const keyMaterial = await e2eEncryptionService.exportKey(encryptionKey.keyId)

      // Convert ArrayBuffer to base64 for transmission
      const keyBase64 = this.arrayBufferToBase64(keyMaterial)

      if (this.callState.callId) {
        if (targetUserId) {
          // Send key to specific participant
          socket.emit(SOCKET.Emitters.Exchange_Encryption_Key, {
            callId: this.callState.callId,
            targetUserId,
            keyId: encryptionKey.keyId,
            keyMaterial: keyBase64,
          })
        } else {
          // Broadcast key to all participants (for group calls)
          socket.emit(SOCKET.Emitters.Exchange_Encryption_Key, {
            callId: this.callState.callId,
            keyId: encryptionKey.keyId,
            keyMaterial: keyBase64,
          })
        }
      }
    } catch (error) {
      console.error('Error generating encryption key:', error)
    }
  }

  /**
   * Handle received encryption key
   */
  private async handleReceivedKey(keyId: string, keyMaterialBase64: string, fromUserId: string): Promise<void> {
    if (!this.isE2EEnabled()) {
      return
    }

    try {
      // Convert base64 back to ArrayBuffer
      const keyMaterial = this.base64ToArrayBuffer(keyMaterialBase64)

      // Import the key
      await e2eEncryptionService.importKey(keyMaterial, keyId)

      // Set as current key if we don't have one (for non-initiators)
      if (!this.callEncryptionKeyId) {
        this.callEncryptionKeyId = keyId
        e2eEncryptionService.setCurrentKeyId(keyId)
      }

      // Mark key exchange as completed for this user
      this.keyExchangeCompleted.set(fromUserId, true)

      // Setup encryption for all existing peer connections now that we have the key
      for (const [userId, pc] of this.peerConnections.entries()) {
        // Only set up if connection is still active
        if (pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
          await this.setupEncryptionForPeerConnection(pc, userId)
        }
      }
    } catch (error) {
      console.error('Error handling received encryption key:', error)
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  private async processPendingIceCandidates(userId: string): Promise<void> {
    const pendingCandidates = this.pendingIceCandidates.get(userId)
    if (pendingCandidates && pendingCandidates.length > 0) {
      const pc = this.peerConnections.get(userId)
      if (pc && pc.remoteDescription) {
        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(candidate)
          } catch (error) {
            console.error(`Error adding pending ICE candidate for ${userId}:`, error)
          }
        }
        this.pendingIceCandidates.delete(userId)
      }
    }
  }

  private syncCurrentStateWithNewParticipant(userId: string) {
    if (this.callState.callId) {
      socket.emit(SOCKET.Emitters.Sync_Participant_State, {
        callId: this.callState.callId,
        targetUserId: userId,
        audioState: this.callState.isAudioEnabled,
        videoState: this.callState.isVideoEnabled,
      })
    }
  }

  private notifyStateChange() {
    this.stateChangeCallbacks.forEach((callback) => callback({ ...this.callState }))
  }

  private notifyParticipantUpdate() {
    this.participantUpdateCallbacks.forEach((callback) => callback(new Map(this.callState.participants)))
  }

  private saveActiveCall() {
    if (
      this.callState.isInCall &&
      this.callState.chatType === ChatType.Channel &&
      this.callState.callId &&
      this.callState.chatId &&
      this.callState.callStatus !== 'ended'
    ) {
      localStorage.setItem(
        'activeCall',
        stringify({
          callId: this.callState.callId,
          chatId: this.callState.chatId,
          chatType: this.callState.chatType,
          callType: this.callState.callType,
          chatName: this.callState.chatName,
        }),
      )
    } else {
      localStorage.removeItem('activeCall')
    }
  }

  private setupSocketListeners() {
    socket.on('incoming-call', async (data) => {
      const { callId, chatId, chatType, callType, chatName, initiator } = data
      this.callState.waitingIncoming = null

      if (this.callState.isInCall) {
        this.callState.waitingIncoming = {
          callId,
          chatId,
          chatType,
          callType,
          chatName,
          initiator: {
            userId: initiator.userId,
            name: initiator.name,
            avatar: initiator.avatar,
            profile_color: initiator.profile_color,
          },
        }
        NotificationService.playWaitingCallNotification()
    
        NotificationService.showBrowserNotification(`${initiator.name} - Call Waiting`, {
          body: `${initiator.name} is trying to reach you`,
        })
        this.notifyStateChange()
      } else {
        this.callState = {
          ...initialCallState,
          callId,
          chatId,
          chatType,
          callType,
          chatName,
          callStatus: 'ringing',
          isVideoEnabled: callType === 'video',
          participants: new Map(),
          targetBusy: false,
          waitingIncoming: null,
        }

        this.callState.participants.set(initiator.userId, {
          userId: initiator.userId,
          socketId: '',
          name: initiator.name,
          avatar: initiator.avatar,
          profile_color: initiator.profile_color,
          isVideoEnabled: initiator.isVideoEnabled || false,
          isAudioEnabled: initiator.isAudioEnabled !== undefined ? initiator.isAudioEnabled : true,
        })

        NotificationService.showBrowserNotification(`${initiator.name} - Incoming Call`, {
          body: `Incoming ${callType} call from ${initiator.name}`,
        })

        NotificationService.playCallSound()

        if (this.ringingTimer) clearTimeout(this.ringingTimer)
        this.ringingTimer = setTimeout(() => {
          if (this.callState.callStatus === 'ringing' && this.callState.callId) {
            this.declineCall(this.callState.callId)
          }
        }, 20000)
        this.notifyStateChange()
        this.notifyParticipantUpdate()
      }
    })

    socket.on('call-participants-sync', (data) => {
      const { callId, participants } = data
      if (this.callState.callId === callId) {
        participants.forEach((participant: any) => {
          this.callState.participants.set(participant.userId, {
            userId: participant.userId,
            socketId: participant.socketId,
            name: participant.name,
            avatar: participant.avatar,
            profile_color: participant.profile_color,
            isVideoEnabled: participant.isVideoEnabled || false,
            isAudioEnabled: participant.isAudioEnabled !== undefined ? participant.isAudioEnabled : true,
            stream: this.callState.participants.get(participant.userId)?.stream,
          })
        })
        this.notifyParticipantUpdate()
        this.notifyStateChange()
      }
    })

    socket.on('call-accepted', async (data) => {
      const { userId, user } = data
      const currentUserId = socket.id
      NotificationService.stopCallSound()
      
      this.callState.callStatus = 'connected'

      if (this.callState.isInitiator) {
        NotificationService.stopOutgoingCallRingtone()
      }

      if (this.callingTimer) {
        clearTimeout(this.callingTimer)
        this.callingTimer = undefined
      }

      if (!this.callState.callStartTime) {
        this.callState.callStartTime = new Date()
      }

      if (!this.callState.participants.has(userId)) {
        this.callState.participants.set(userId, {
          userId: user.userId,
          socketId: '',
          name: user.name,
          avatar: user.avatar,
          profile_color: user.profile_color,
          isVideoEnabled: user.isVideoEnabled || false,
          isAudioEnabled: user.isAudioEnabled !== undefined ? user.isAudioEnabled : true,
          joinedAt: new Date(),
        })
      }

      if (this.callState.isInCall && userId !== currentUserId && this.callState.callId) {
        await this.createPeerConnection(userId)
        
        // If we're the initiator and have a key, send it to the new participant
        if (this.callState.isInitiator && this.isE2EEnabled() && this.callEncryptionKeyId) {
          await this.generateAndExchangeKey(userId)
        }
      }

      // Auto-start recording when call connects
      if (!this.recordingStarted && this.callState.callId && this.localStream) {
        this.startAutoRecording()
      }

      this.notifyStateChange()
    })

    socket.on('connect-with-participant', async (data) => {
      const { userId, user } = data

      if (!this.callState.participants.has(userId)) {
        this.callState.participants.set(userId, {
          userId: user.userId,
          socketId: user.socketId || '',
          name: user.name,
          avatar: user.avatar,
          profile_color: user.profile_color,
          isVideoEnabled: user.isVideoEnabled || false,
          isAudioEnabled: user.isAudioEnabled !== undefined ? user.isAudioEnabled : true,
        })
      }

      if (!this.peerConnections.has(userId) && this.callState.callId) {
        await this.createPeerConnection(userId)
        
        // If we're the initiator and have a key, send it to the new participant
        if (this.callState.isInitiator && this.isE2EEnabled() && this.callEncryptionKeyId) {
          await this.generateAndExchangeKey(userId)
        }
      }

      this.notifyStateChange()
      this.notifyParticipantUpdate()
    })

    socket.on('call-declined', (data) => {
      const { callId, userId } = data
      if (this.callState.callId === callId) {
        if (this.callState.isInitiator) {
          NotificationService.stopOutgoingCallRingtone()
          if (this.callState.chatType === ChatType.DM) {
            const participant = this.callState.participants.get(userId)
            const key = `${callId}-${userId}`
            if (!this.declineNotifications.has(key)) {
              const displayName = participant ? participant.name : this.callState.chatName || 'Unknown user'
              toaster('info', `${displayName} declined the call.`)
              this.declineNotifications.add(key)
              setTimeout(() => this.declineNotifications.delete(key), 20000)
            }
          }
        }
        if (this.callState.chatType === ChatType.DM) {
          this.endCall()
        } else if (this.callState.chatType === ChatType.Channel) {
          this.notifyParticipantUpdate()
          this.notifyStateChange()
        }
      }
    })

    socket.on('call-ended', (data) => {
      const { callId } = data
      if (this.callState.callId === callId) {
        this.endCall()
      } else if (this.callState.waitingIncoming?.callId === callId) {
        toaster('info', `Missed call from ${this.callState.waitingIncoming?.initiator.name}`)
        this.callState.waitingIncoming = null
        this.notifyStateChange()
      }
    })

    socket.on('participant-left', (data) => {
      const { userId, callId } = data
      if (this.callState.callId === callId) {
        this.callState.participants.delete(userId)
        const pc = this.peerConnections.get(userId)
        if (pc) {
          pc.close()
          this.peerConnections.delete(userId)
        }
        this.pendingIceCandidates.delete(userId)
        this.peerConnectionStates.delete(userId)
        this.negotiationLocks.delete(userId)
        this.notifyParticipantUpdate()
        this.notifyStateChange()
      }
    })

    socket.on(SOCKET.Emitters.Webrtc_Offer, async (data) => {
      const { offer, fromUserId } = data

      try {
        let pc = this.peerConnections.get(fromUserId)
        if (!pc && this.callState.callId) {
          pc = await this.createPeerConnection(fromUserId)
        }

        if (!pc) {
          console.error(`No peer connection available for ${fromUserId}`)
          return
        }

        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          console.warn(`PC ${fromUserId} not in correct state for offer:`, pc.signalingState)
          return
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        await this.processPendingIceCandidates(fromUserId)

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        if (this.callState.callId) {
          socket.emit(SOCKET.Emitters.Webrtc_Answer, {
            callId: this.callState.callId,
            targetUserId: fromUserId,
            answer,
          })
        }
      } catch (error) {
        console.error(`Error handling offer from ${fromUserId}:`, error)
        const pc = this.peerConnections.get(fromUserId)
        if (pc) {
          pc.close()
          this.peerConnections.delete(fromUserId)
        }
      }
    })

    socket.on(SOCKET.Emitters.Webrtc_Answer, async (data) => {
      const { answer, fromUserId } = data
      const pc = this.peerConnections.get(fromUserId)

      if (!pc) {
        console.error(`No peer connection found for ${fromUserId}`)
        return
      }

      try {
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`PC ${fromUserId} not in correct state for answer:`, pc.signalingState)
          return
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        await this.processPendingIceCandidates(fromUserId)
      } catch (error) {
        console.error(`Error setting remote description for ${fromUserId}:`, error)
      }
    })

    socket.on(SOCKET.Emitters.Ice_Candidate, async (data) => {
      const { candidate, fromUserId } = data
      const pc = this.peerConnections.get(fromUserId)

      if (!pc) {
        console.warn(`No peer connection found for ICE candidate from ${fromUserId}`)
        return
      }

      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } else {
          if (!this.pendingIceCandidates.has(fromUserId)) {
            this.pendingIceCandidates.set(fromUserId, [])
          }
          this.pendingIceCandidates.get(fromUserId)!.push(new RTCIceCandidate(candidate))
        }
      } catch (error) {
        console.error(`Error adding ICE candidate from ${fromUserId}:`, error)
      }
    })

    socket.on('participant-toggle-video', (data) => {
      const { userId, isVideoEnabled } = data
      const participant = this.callState.participants.get(userId)
      if (participant) {
        participant.isVideoEnabled = isVideoEnabled
        this.callState.participants.set(userId, participant)
        this.notifyParticipantUpdate()
      }
    })

    socket.on('participant-toggle-audio', (data) => {
      const { userId, isAudioEnabled } = data
      const participant = this.callState.participants.get(userId)
      if (participant) {
        participant.isAudioEnabled = isAudioEnabled
        this.callState.participants.set(userId, participant)
        this.notifyParticipantUpdate()
      }
    })

    socket.on(SOCKET.Emitters.Sync_Participant_State, (data) => {
      const { fromUserId, audioState, videoState } = data
      const participant = this.callState.participants.get(fromUserId)
      if (participant) {
        participant.isAudioEnabled = audioState
        participant.isVideoEnabled = videoState
        this.callState.participants.set(fromUserId, participant)
        this.notifyParticipantUpdate()
      }
    })

    socket.on('call-busy', (data) => {
      const { targetUser, callId } = data
      if (this.callState.callId === callId) {
        toaster('info', `${targetUser.name} is currently on another call`)
        this.callState.targetBusy = true
        if (this.callState.isInitiator) {
          NotificationService.stopOutgoingCallRingtone()
        }
        this.notifyStateChange()
      }
    })

    socket.on('rejoin-call-accepted', (data) => {
      const { callId, user, participants, chatName } = data
      this.updateCallStateForRejoin(callId, user, participants, chatName)
    })

    socket.on('force-stop-screen-share', async (data) => {
      const { callId } = data

      if (this.callState.callId === callId && this.callState.isScreenSharing) {
        await this.stopScreenShare(this.callState.localStream)
        toaster('info', 'Another participant started screen sharing')
      }
    })

    socket.on('participant-screen-share-started', (data) => {
      const { callId, userId } = data

      if (this.callState.callId === callId) {
        const participant = this.callState.participants.get(userId)
        if (participant) {
          participant.isScreenSharing = true
          this.callState.participants.set(userId, participant)
        }
      }
    })

    socket.on('participant-screen-share-stopped', (data) => {
      const { callId, userId } = data

      if (this.callState.callId === callId) {
        const participant = this.callState.participants.get(userId)
        if (participant) {
          participant.isScreenSharing = false
          this.callState.participants.set(userId, participant)
        }
      }
    })

    // Remote Control Listeners
    socket.on('remote-control-request', (data: { callId: string; requesterId: string; requesterName: string }) => {
      if (this.callState.callId === data.callId && this.callState.isScreenSharing) {
        this.callState.remoteControl.pendingRequestFrom = data.requesterId
        this.callState.remoteControl.pendingRequestName = data.requesterName
        this.notifyStateChange()
        this.notifyRemoteControlChange()
      }
    })

    socket.on('remote-control-accepted', (data: { callId: string; targetUserId: string; screenWidth?: number; screenHeight?: number }) => {
      if (this.callState.callId === data.callId) {
        this.callState.remoteControl.targetUserId = data.targetUserId
        this.callState.remoteControl.isActive = true
        this.callState.remoteControl.screenWidth = data.screenWidth || 1920
        this.callState.remoteControl.screenHeight = data.screenHeight || 1080
        this.notifyStateChange()
        this.notifyRemoteControlChange()
        toaster('success', 'Remote control granted!')
      }
    })

    socket.on('remote-control-denied', (data: { callId: string }) => {
      if (this.callState.callId === data.callId) {
        this.callState.remoteControl.targetUserId = null
        this.notifyStateChange()
        this.notifyRemoteControlChange()
        toaster('info', 'Remote control request was denied.')
      }
    })

    socket.on('remote-control-stopped', (data: { callId: string; userId: string }) => {
      if (this.callState.callId === data.callId) {
        if (this.callState.remoteControl.isActive) {
          this.disconnectDesktopAgent()
        }
        this.callState.remoteControl = { ...initialRemoteControlState }
        this.notifyStateChange()
        this.notifyRemoteControlChange()
        toaster('info', 'Remote control session ended.')
      }
    })

    // E2E Encryption Key Exchange Listeners
    socket.on(SOCKET.Emitters.Exchange_Encryption_Key, async (data) => {
      const { callId, keyId, keyMaterial, fromUserId } = data

      if (this.callState.callId === callId) {
        const senderId = fromUserId || socket.id
        if (senderId && senderId !== socket.id) {
          // Only process keys from other participants
          await this.handleReceivedKey(keyId, keyMaterial, senderId)
        }
      }
    })

    socket.on(SOCKET.Emitters.Encryption_Key_Received, (data) => {
      const { callId, fromUserId } = data
      if (this.callState.callId === callId) {
        this.keyExchangeCompleted.set(fromUserId, true)
      }
    })
  }
}

export const webrtcService = new WebRTCService()
