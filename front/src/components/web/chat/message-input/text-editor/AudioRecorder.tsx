import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from 'reactstrap'
import { SvgIcon } from '../../../../../shared/icons'
import { AudioRecorderProps } from '../../../../../types'
import { toaster } from '../../../../../utils/custom-functions'

const WAVE_BAR_COUNT = 60
import { RiCloseLine } from 'react-icons/ri'

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onDirectSend, onCancel, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const shouldSendAfterStopRef = useRef(false)

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopMediaStream = useCallback(() => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const resetState = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    setIsPlaying(false)
    shouldSendAfterStopRef.current = false
    clearTimer()
    stopMediaStream()
    mediaRecorderRef.current = null
  }, [clearTimer, stopMediaStream])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)
  }, [])

  const createAudioFile = useCallback((blob: Blob) => {
    return new File([blob], `recording-${Date.now()}.mp3`, { type: 'audio/mp3' })
  }, [])

  const sendAudio = useCallback(async (blob: Blob, url: string | null) => {
    const audioFile = createAudioFile(blob)
    await onDirectSend(audioFile)
    if (url) URL.revokeObjectURL(url)
    resetState()
  }, [createAudioFile, onDirectSend, resetState])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/mp3' })
        const url = URL.createObjectURL(blob)

        setAudioBlob(blob)
        setAudioUrl(url)
        setIsRecording(false)
        stopMediaStream()
        clearTimer()

        if (shouldSendAfterStopRef.current) {
          await sendAudio(blob, url)
        }
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setIsPaused(false)
      startTimer()
    } catch (error) {
      toaster('warn', "Plug in your microphone to start recording")
    }
  }, [clearTimer, sendAudio, startTimer, stopMediaStream])

  const pauseResumeRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      startTimer()
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      clearTimer()
    }
  }, [isPaused, startTimer, clearTimer])

  const deleteAudio = useCallback(() => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      mediaRecorderRef.current.stop()
    }
    resetState()
  }, [isRecording, isPaused, resetState])

  const playPauseAudio = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleSend = useCallback(async () => {
    if (isRecording || isPaused) {
      if (mediaRecorderRef.current) {
        shouldSendAfterStopRef.current = true
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        setIsPaused(false)
        clearTimer()
      }
    } else if (audioBlob) {
      await sendAudio(audioBlob, audioUrl)
    }
  }, [audioBlob, audioUrl, isRecording, isPaused, clearTimer, sendAudio])

  const handleCancel = useCallback(() => {
    deleteAudio()
    onCancel()
  }, [deleteAudio, onCancel])

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      stopMediaStream()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl, clearTimer, stopMediaStream])

  // UI state helpers
  const showRecordButton = !isRecording && !audioBlob && !isPaused
  const showRecordingControls = isRecording || isPaused
  const showPlaybackControls = !isRecording && !isPaused && audioBlob
  const showAudioPreview = isRecording || isPaused || audioBlob

  return (
    <div className="audio-recorder-interface">
      {showAudioPreview && (
        <div className="audio-preview">
          <div className="waveform-placeholder">
            {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => (
              <div
                key={i}
                className={`wave-bar ${isRecording && !isPaused ? 'active' : ''}`}
              />
            ))}
          </div>
          <span className="recording-time">{formatTime(recordingTime)}</span>
          {audioBlob && !isRecording && (
            <audio
              ref={audioRef}
              src={audioUrl || ''}
              onEnded={handleAudioEnded}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              className="hidden-audio"
            />
          )}
        </div>
      )}

      <div className="audio-controls">
        <Button
          className="audio-cancel-btn"
          color="transparent"
          onClick={handleCancel}
          size="sm"
          disabled={disabled}
          title="Cancel Recording"
        >
          <RiCloseLine />
        </Button>
        {showRecordButton && (
          <Button className="record-btn" onClick={startRecording} size="lg" disabled={disabled} title="Start Recording">
            <SvgIcon className="audio-icon" iconId="mic" />
          </Button>
        )}

        {showRecordingControls && (
          <>
            {isPaused && audioBlob && (
              <Button
                className="audio-play-btn"
                onClick={playPauseAudio}
                size="sm"
                disabled={disabled}
                title={isPlaying ? 'Pause Preview' : 'Play Preview'}
              >
                <SvgIcon className="audio-icon" iconId={isPlaying ? 'pause' : 'play'} />
              </Button>
            )}

            <Button
              className="audio-pause-btn"
              disabled={disabled}
              onClick={pauseResumeRecording}
              size="lg"
              title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              <SvgIcon className="audio-icon" iconId={isPaused ? 'play' : 'pause'} />
            </Button>

            <Button
              className="audio-send-btn"
              onClick={handleSend}
              size="sm"
              disabled={disabled}
              title="Send Recording"
            >
              <SvgIcon className="audio-icon" iconId="send-btn" />
            </Button>
          </>
        )}

        {showPlaybackControls && (
          <>
            <Button
              className="audio-replay-btn"
              onClick={playPauseAudio}
              size="sm"
              disabled={disabled}
              title={isPlaying ? 'Pause Playback' : 'Play Recording'}
            >
              <SvgIcon className="audio-icon" iconId={isPlaying ? 'pause' : 'play'} />
            </Button>
            <Button
              className="audio-send-btn"
              onClick={handleSend}
              size="sm"
              disabled={disabled}
              title="Send Recording"
              color='transparent'
            >
              <SvgIcon className="audio-icon" iconId="send-btn" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default AudioRecorder