import { URL_KEYS } from '../constants/url'
import { apiClient } from '../api'

interface VideoSource {
  stream: MediaStream
  label: string
  isScreenShare: boolean
}

class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private isRecording = false
  private audioContext: AudioContext | null = null
  private mixedDestination: MediaStreamAudioDestinationNode | null = null
  private connectedSources: Map<string, MediaStreamAudioSourceNode> = new Map()
  private recordingStartTime: Date | null = null
  private callMetadata: {
    callId: string
    callType: 'audio' | 'video'
    chatType: string
    chatId: string
    chatName: string
    teamId: string | number
  } | null = null

  private canvas: HTMLCanvasElement | null = null
  private canvasCtx: CanvasRenderingContext2D | null = null
  private videoSources: Map<string, VideoSource> = new Map()
  private drawInterval: ReturnType<typeof setInterval> | null = null
  private videoElements: Map<string, HTMLVideoElement> = new Map()

  private readonly CANVAS_WIDTH = 1280
  private readonly CANVAS_HEIGHT = 720
  private readonly DRAW_FPS = 15

  startRecording(
    localStream: MediaStream | null,
    callMetadata: {
      callId: string
      callType: 'audio' | 'video'
      chatType: string
      chatId: string
      chatName: string
      teamId: string | number
    },
  ): boolean {
    if (this.isRecording) return false

    try {
      this.callMetadata = callMetadata
      this.recordedChunks = []

      // Setup audio mixing
      this.audioContext = new AudioContext()
      this.mixedDestination = this.audioContext.createMediaStreamDestination()

      if (localStream) {
        this.addAudioStream('local', localStream)
      }

      const tracksToRecord: MediaStreamTrack[] = []

      // Add mixed audio track
      this.mixedDestination.stream.getAudioTracks().forEach((t) => tracksToRecord.push(t))

      if (callMetadata.callType === 'video') {
        // Setup canvas for video compositing
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.CANVAS_WIDTH
        this.canvas.height = this.CANVAS_HEIGHT
        this.canvasCtx = this.canvas.getContext('2d')!

        // Add local video source
        if (localStream && localStream.getVideoTracks().length > 0) {
          this.addVideoSource('local', localStream, 'Local', false)
        }

        // Start drawing loop
        this.startDrawLoop()

        // Get canvas stream and add video track
        const canvasStream = this.canvas.captureStream(this.DRAW_FPS)
        const canvasVideoTrack = canvasStream.getVideoTracks()[0]
        if (canvasVideoTrack) {
          tracksToRecord.push(canvasVideoTrack)
        }
      }

      const combinedStream = new MediaStream(tracksToRecord)

      const mimeType = this.getSupportedMimeType(callMetadata.callType === 'video')
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2000000,
        audioBitsPerSecond: 128000,
      })

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.uploadRecording()
      }

      this.mediaRecorder.start(1000)
      this.recordingStartTime = new Date()
      this.isRecording = true
      console.log('[Recording] Started recording call:', callMetadata.callId)
      return true
    } catch (error) {
      console.error('[Recording] Failed to start recording:', error)
      this.cleanup()
      return false
    }
  }

  addAudioStream(id: string, stream: MediaStream): void {
    if (!this.audioContext || !this.mixedDestination) return
    if (this.connectedSources.has(id)) return

    try {
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        const source = this.audioContext.createMediaStreamSource(stream)
        source.connect(this.mixedDestination)
        this.connectedSources.set(id, source)
      }
    } catch (error) {
      console.error('[Recording] Failed to add audio stream:', error)
    }
  }

  addVideoSource(id: string, stream: MediaStream, label: string, isScreenShare: boolean): void {
    if (!this.isRecording && !this.canvas) return

    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length === 0) return

    // Create hidden video element to decode the stream
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.play().catch(() => {})

    this.videoElements.set(id, video)
    this.videoSources.set(id, { stream, label, isScreenShare })

    console.log(`[Recording] Added video source: ${id} (${label}, screenShare: ${isScreenShare})`)
  }

  removeVideoSource(id: string): void {
    const video = this.videoElements.get(id)
    if (video) {
      video.srcObject = null
      video.remove()
      this.videoElements.delete(id)
    }
    this.videoSources.delete(id)
    console.log(`[Recording] Removed video source: ${id}`)
  }

  addRemoteStream(userId: string, stream: MediaStream): void {
    // Add audio
    this.addAudioStream(userId, stream)

    // Add video if present
    if (stream.getVideoTracks().length > 0) {
      this.addVideoSource(userId, stream, `Remote-${userId}`, false)
    }
  }

  setScreenShareStream(id: string, stream: MediaStream | null): void {
    const screenShareId = `screenshare-${id}`

    if (stream && stream.getVideoTracks().length > 0) {
      // Add screen share as a video source
      this.addVideoSource(screenShareId, stream, 'Screen Share', true)
      // Also capture screen share audio if available
      this.addAudioStream(screenShareId, stream)
      console.log(`[Recording] Screen share started for: ${id}`)
    } else {
      // Remove screen share source
      this.removeVideoSource(screenShareId)
      this.removeAudioStream(screenShareId)
      console.log(`[Recording] Screen share stopped for: ${id}`)
    }
  }

  removeAudioStream(id: string): void {
    const source = this.connectedSources.get(id)
    if (source) {
      try {
        source.disconnect()
      } catch (_e) {
        /* already disconnected */
      }
      this.connectedSources.delete(id)
    }
  }

  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return

    try {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
      this.isRecording = false
      console.log('[Recording] Stopped recording')
    } catch (error) {
      console.error('[Recording] Error stopping recording:', error)
      this.uploadRecording()
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }

  private startDrawLoop(): void {
    if (this.drawInterval) clearInterval(this.drawInterval)

    this.drawInterval = setInterval(() => {
      this.drawFrame()
    }, 1000 / this.DRAW_FPS)
  }

  private drawFrame(): void {
    if (!this.canvasCtx || !this.canvas) return

    const ctx = this.canvasCtx
    const W = this.canvas.width
    const H = this.canvas.height

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    // Collect active video sources
    const activeSources: { id: string; video: HTMLVideoElement; source: VideoSource }[] = []
    const screenShareSources: { id: string; video: HTMLVideoElement; source: VideoSource }[] = []

    this.videoSources.forEach((source, id) => {
      const video = this.videoElements.get(id)
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        if (source.isScreenShare) {
          screenShareSources.push({ id, video, source })
        } else {
          activeSources.push({ id, video, source })
        }
      }
    })

    if (screenShareSources.length > 0) {
      // Screen share layout: screen share takes most of the space
      const screenShare = screenShareSources[0]

      // Draw screen share as main content
      const mainW = activeSources.length > 0 ? W * 0.75 : W
      this.drawVideoFit(ctx, screenShare.video, 0, 0, mainW, H)

      // Draw camera feeds in a column on the right
      if (activeSources.length > 0) {
        const sideW = W - mainW
        const cellH = Math.floor(H / activeSources.length)

        activeSources.forEach((src, i) => {
          const y = i * cellH
          this.drawVideoFit(ctx, src.video, mainW, y, sideW, cellH)

          // Draw subtle border
          ctx.strokeStyle = '#333'
          ctx.lineWidth = 1
          ctx.strokeRect(mainW, y, sideW, cellH)
        })
      }
    } else if (activeSources.length > 0) {
      // Grid layout for camera-only calls
      const count = activeSources.length
      const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3
      const rows = Math.ceil(count / cols)
      const cellW = Math.floor(W / cols)
      const cellH = Math.floor(H / rows)

      activeSources.forEach((src, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = col * cellW
        const y = row * cellH

        this.drawVideoFit(ctx, src.video, x, y, cellW, cellH)

        // Draw subtle border between cells
        if (count > 1) {
          ctx.strokeStyle = '#333'
          ctx.lineWidth = 1
          ctx.strokeRect(x, y, cellW, cellH)
        }
      })
    } else {
      // No video - show text
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Recording audio...', W / 2, H / 2)
    }
  }

  private drawVideoFit(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw === 0 || vh === 0) return

    const videoAspect = vw / vh
    const cellAspect = w / h

    let drawW: number, drawH: number, drawX: number, drawY: number

    if (videoAspect > cellAspect) {
      // Video is wider - fit by width
      drawW = w
      drawH = w / videoAspect
      drawX = x
      drawY = y + (h - drawH) / 2
    } else {
      // Video is taller - fit by height
      drawH = h
      drawW = h * videoAspect
      drawX = x + (w - drawW) / 2
      drawY = y
    }

    // Fill background for letterbox/pillarbox
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(x, y, w, h)

    ctx.drawImage(video, drawX, drawY, drawW, drawH)
  }

  private getSupportedMimeType(preferVideo: boolean = true): string {
    if (preferVideo) {
      const videoTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
      for (const type of videoTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type
        }
      }
    }

    const audioTypes = ['audio/webm;codecs=opus', 'audio/webm']
    for (const type of audioTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return ''
  }

  private async uploadRecording(): Promise<void> {
    if (this.recordedChunks.length === 0 || !this.callMetadata) {
      this.cleanup()
      return
    }

    try {
      const mimeType = this.getSupportedMimeType(this.callMetadata.callType === 'video')
      const blob = new Blob(this.recordedChunks, { type: mimeType })

      const duration = this.recordingStartTime
        ? Math.floor((Date.now() - this.recordingStartTime.getTime()) / 1000)
        : 0

      if (blob.size < 1000) {
        console.log('[Recording] Recording too small, skipping upload')
        this.cleanup()
        return
      }

      const formData = new FormData()
      formData.append('recording', blob, `recording_${this.callMetadata.callId}.webm`)
      formData.append('call_id', this.callMetadata.callId)
      formData.append('call_type', this.callMetadata.callType)
      formData.append('chat_type', this.callMetadata.chatType)
      formData.append('chat_id', this.callMetadata.chatId)
      formData.append('chat_name', this.callMetadata.chatName || 'Unknown')
      formData.append('duration', duration.toString())
      formData.append('participants', JSON.stringify([]))

      const response = await apiClient.post(URL_KEYS.Recordings.Upload, formData, {
        timeout: 120000,
      })

      console.log('[Recording] Upload successful:', response.data?.recording?.id)
    } catch (error) {
      console.error('[Recording] Upload failed:', error)
    } finally {
      this.cleanup()
    }
  }

  private cleanup(): void {
    // Stop draw loop
    if (this.drawInterval) {
      clearInterval(this.drawInterval)
      this.drawInterval = null
    }

    // Cleanup video elements
    this.videoElements.forEach((video) => {
      video.srcObject = null
      video.remove()
    })
    this.videoElements.clear()
    this.videoSources.clear()

    // Cleanup canvas
    this.canvas = null
    this.canvasCtx = null

    // Cleanup audio
    this.connectedSources.forEach((source) => {
      try {
        source.disconnect()
      } catch (_e) {
        /* ignore */
      }
    })
    this.connectedSources.clear()

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {})
    }
    this.audioContext = null
    this.mixedDestination = null
    this.mediaRecorder = null
    this.recordedChunks = []
    this.recordingStartTime = null
    this.callMetadata = null
  }
}

export const recordingService = new RecordingService()
