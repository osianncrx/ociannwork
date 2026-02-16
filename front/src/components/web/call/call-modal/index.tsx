import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Button, Modal, ModalBody } from 'reactstrap'
import { CHAT_CONSTANTS, ChatType, ImageBaseUrl } from '../../../../constants'
import { NotificationService } from '../../../../services/notification.service'
import { CallParticipant, CallState, RemoteControlState, webrtcService } from '../../../../services/webrtc.service'
import { SvgIcon } from '../../../../shared/icons'
import { useAppSelector } from '../../../../store/hooks'
import { setCallParticipants, setCurrentCallStatus } from '../../../../store/slices/chatSlice'
import { CallModalProps } from '../../../../types'
import CallControls from './CallControls'
import RemoteControlRequestModal from './RemoteControlRequestModal'
import { Image } from '../../../../shared/image'

const CallModal: FC<CallModalProps> = ({ isOpen, onClose, isMinimized, onMinimize, onMaximize }) => {
  const [callState, setCallState] = useState<CallState>(webrtcService.getCallState())
  const [participants, setParticipants] = useState<Map<string, CallParticipant>>(new Map())
  const [callDuration, setCallDuration] = useState<string>('00:00')
  const [isMaximized, setIsMaximized] = useState<boolean>(false)
  const [isManuallyMaximized, setIsManuallyMaximized] = useState<boolean>(false);
  const [e2eStatus, setE2EStatus] = useState(webrtcService.getE2EStatus())
  const [remoteControl, setRemoteControl] = useState<RemoteControlState>(webrtcService.getRemoteControlState())
  const { user } = useAppSelector((store) => store.auth)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const autoOpenedScreenShareRef = useRef(false)
  const dispatch = useDispatch()

  const attachLocalStream = useCallback(() => {
    const video = localVideoRef.current
    if (!video) return
    video.srcObject = null

    if (callState.isScreenSharing && callState.screenShareStream) {
      video.srcObject = callState.screenShareStream
    } else if (callState.callType === 'video' && callState.localStream && callState.isVideoEnabled) {
      video.srcObject = callState.localStream
    } else {
      video.srcObject = null
    }
    video.play().catch((error) => console.warn('Local video play error:', error))
  }, [
    callState.isScreenSharing,
    callState.screenShareStream,
    callState.callType,
    callState.localStream,
    callState.isVideoEnabled,
  ])

  const attachRemoteVideos = useCallback(() => {
    if (callState.callType === 'video') {
      participants.forEach((participant, userId) => {
        if (participant.stream && userId !== user?.id) {
          const videoElement = remoteVideosRef.current.get(userId)
          if (videoElement && videoElement.srcObject !== participant.stream) {
            videoElement.srcObject = participant.stream
            videoElement.onloadedmetadata = () => {
              videoElement.play().catch((error) => console.warn('Remote video play error:', error))
            }
          }
        }
      })
    }
  }, [participants, user?.id, callState.callType])

  useEffect(() => {
    participants.forEach((participant, userId) => {
      if (participant.stream && userId !== user?.id) {
        const audioElement = remoteAudiosRef.current.get(userId)
        if (audioElement && audioElement.srcObject !== participant.stream) {
          audioElement.srcObject = participant.stream
          audioElement.onloadedmetadata = () => {
            audioElement.play().catch((error) => console.warn('Audio play error:', error))
          }
        }
      }
    })
  }, [participants, user?.id, isMinimized, callState.isScreenSharing])

  useEffect(() => {
    const unsubscribeState = webrtcService.onStateChange((state) => {
      setCallState(state)
      setE2EStatus(webrtcService.getE2EStatus())
      setRemoteControl(state.remoteControl)
    })
    const unsubscribeParticipants = webrtcService.onParticipantUpdate(setParticipants)
    const unsubscribeRC = webrtcService.onRemoteControlChange(setRemoteControl)

    return () => {
      unsubscribeState()
      unsubscribeParticipants()
      unsubscribeRC()
      NotificationService.stopCallSound()
    }
  }, [])

  useEffect(() => {
    dispatch(
      setCallParticipants({
        participants: Array.from(participants.values()).map((p) => p.userId),
        channelId: callState.chatId,
        chatType: callState.chatType,
      }),
    )
  }, [participants, dispatch])

  // Update call duration
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (callState.callStatus === 'connected') {
      const startTime = new Date()

      interval = setInterval(() => {
        const now = new Date()
        const diff = now.getTime() - startTime.getTime()
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)
    } else {
      setCallDuration('00:00')
    }

    return () => clearInterval(interval)
  }, [callState.callStatus])

  // Handle local video - Updated to reattach when minimized state changes
  useEffect(() => {
    let timer: NodeJS.Timeout

    const attachStream = () => {
      const video = localVideoRef.current
      if (video && callState.callType === 'video' && (callState.localStream || callState.screenShareStream)) {
        if (callState.isScreenSharing && callState.screenShareStream) {
          video.srcObject = callState.screenShareStream
        } else {
          video.srcObject = callState.localStream
        }
        video.onloadedmetadata = () => {
          video.play().catch((error) => console.warn('Local video play error:', error))
        }
      } else if (callState.localStream || callState.screenShareStream) {
        timer = setTimeout(attachStream, 100)
      }
    }

    attachStream()
    return () => clearTimeout(timer)
  }, [callState.localStream, callState.screenShareStream, callState.callType, isMinimized, callState.isScreenSharing])

  // Handle remote videos - Updated to reattach when minimized state changes
  useEffect(() => {
    if (callState.callType === 'video') {
      participants.forEach((participant, userId) => {
        if (participant.stream && userId !== user?.id) {
          const videoElement = remoteVideosRef.current.get(userId)
          if (videoElement) {
            videoElement.srcObject = participant.stream
            videoElement.onloadedmetadata = () => {
              videoElement.play().catch((error) => console.warn('Remote video play error:', error))
            }
          }
        }
      })
    }
  }, [participants, user?.id, callState.callType, isMinimized])

  // Additional effect to ensure streams are reattached when maximizing
  useEffect(() => {
    if (!isMinimized && callState.callType === 'video') {
      const timer = setTimeout(() => {
        attachLocalStream()
        attachRemoteVideos()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isMinimized, attachLocalStream, attachRemoteVideos])

  useEffect(() => {
    if (callState.callStatus === 'ringing' && !callState.isInitiator) {
      const timer = setTimeout(() => {
        handleDeclineCall()
      }, CHAT_CONSTANTS.AUTO_DECLINE_CALL)

      return () => clearTimeout(timer)
    }
  }, [callState.callStatus, callState.isInitiator])

  useEffect(() => {
    if (callState.callStatus === 'calling' && callState.isInitiator) {
      const timer = setTimeout(() => {
        handleEndCall()
      }, CHAT_CONSTANTS.AUTO_DECLINE_CALL)
      return () => clearTimeout(timer)
    }
  }, [callState.callStatus, callState.isInitiator])

  const handleEndCall = async () => {
    await webrtcService.endCall()
    onClose()
  }

  const handleDeclineCall = async () => {
    await webrtcService.declineCall(callState.callId!)
    onClose()
  }

  const handleMaximizeScreen = () => {
    setIsMaximized(true)
    setIsManuallyMaximized(true);
  }

  const handleRestoreScreen = () => {
    setIsMaximized(false)
    setIsManuallyMaximized(false);
  }

  useEffect(() => {
    attachLocalStream()
  }, [attachLocalStream])

  useEffect(() => {
    const video = localVideoRef.current
    if (!video) return
    if (!callState.isScreenSharing && !callState.isVideoEnabled) {
      video.srcObject = null
      video.load()
    }
  }, [callState.isScreenSharing, callState.isVideoEnabled])

  useEffect(() => {
    const isAnyoneScreenSharing =
      callState.isScreenSharing ||
      Array.from(participants.values()).some(
        (participant) => participant.isScreenSharing && participant.userId !== user?.id,
      )
    if (isAnyoneScreenSharing && !autoOpenedScreenShareRef.current) {
      setIsMaximized(true)
      autoOpenedScreenShareRef.current = true
    } else if (!isAnyoneScreenSharing && !isManuallyMaximized) {
      autoOpenedScreenShareRef.current = false
      setIsMaximized(false)
    }
  }, [callState.isScreenSharing, callState.screenShareStream, participants, user?.id, isManuallyMaximized])

  const getCallStatusText = () => {
    switch (callState.callStatus) {
      case 'calling':
        return 'Calling...'
      case 'ringing':
        return 'Incoming call'
      case 'connected':
        return callDuration
      default:
        return ''
    }
  }

  useEffect(() => {
    dispatch(setCurrentCallStatus(callState.callStatus))
  }, [callState.callStatus])

  const getCallerName = () => {
    if (
      callState.chatType === ChatType.DM &&
      !callState.isInitiator &&
      callState.callStatus === 'connected' &&
      user?.id
    ) {
      const caller = Array.from(participants.values()).find((participant) => participant.userId !== user.id)
      return caller?.name || 'Caller'
    }
    return callState.chatName || 'Unknown'
  }

  const remoteParticipants = Array.from(participants.values()).filter((p) => p.userId !== user?.id)
  const isEncrypted = e2eStatus.enabled && e2eStatus.supported && e2eStatus.active

  if (!isOpen || !callState.callId) return null

  // Minimized view
  if (isMinimized) {
    return (
      <div className="call-minimized">
        <div className="minimized-call-info">
          <div className="call-avatar">
            {callState.callType === 'video' && (callState.localStream || callState.screenShareStream) ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="minimized-video" />
            ) : (
              <div className="avatar-placeholder">{user?.name?.charAt(0)}</div>
            )}
          </div>
          <div className="call-details">
            <span className="caller-name">{getCallerName()}</span>
            <span className="call-time">{callDuration}</span>
          </div>
          <div className="minimized-controls">
            <Button color="link" size="sm" onClick={onMaximize} className="expand-btn btn-button-glass">
              <SvgIcon iconId="expand" />
            </Button>
            <Button color="danger" size="sm" onClick={handleEndCall} className="end-call-btns">
              <SvgIcon iconId="end-call-vc" />
            </Button>
          </div>
        </div>
        <div style={{ display: 'none' }}>
          {remoteParticipants.map((participant) => (
            <audio
              key={participant.userId}
              ref={(el) => {
                if (el) {
                  remoteAudiosRef.current.set(participant.userId, el)
                }
              }}
              autoPlay
              playsInline
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      toggle={() => {}}
      size="sm"
      centered
      backdrop="static"
      keyboard={false}
      className={`call-modal ${isMaximized ? 'maximize-screen' : ''}`}
    >
      <ModalBody className="p-0">
        <div className="call-container">
          <div className="call-header">
            <div className="name-aligns">
              <span className="call-duration">{getCallStatusText()}</span>
              {isEncrypted && (
                <span
                className="encrypted-msg"
                  title="End-to-end encrypted"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginLeft: 10,
                    padding: '3px 10px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SvgIcon iconId="lock" />
                  </span>
                  <span style={{ whiteSpace: 'nowrap', letterSpacing: 0.3 }}>Encrypted</span>
                </span>
              )}
            </div>
            <div className="call-actions">
              {callState.callType === 'video' && (
                <>
                  {isMaximized ? (
                    <Button
                      color="link"
                      size="sm"
                      onClick={handleRestoreScreen}
                      className="expand-btn btn-button-glass"
                      title="Restore"
                    >
                      <SvgIcon iconId="minimize" />
                    </Button>
                  ) : (
                    <Button
                      color="link"
                      size="sm"
                      onClick={handleMaximizeScreen}
                      className="expand-btn btn-button-glass"
                      title="Maximize"
                    >
                      <SvgIcon iconId="expand" />
                    </Button>
                  )}
                </>
              )}
              {(callState.callType === 'audio' || !isMaximized) && (
                <Button
                  color="link"
                  size="sm"
                  onClick={onMinimize}
                  className="minimize-btn btn-button-glass"
                  title="Minimize"
                >
                  <SvgIcon iconId="minimize" />
                </Button>
              )}
            </div>
          </div>

          <div className="video-area">
            {callState.callType === 'video' ? (
              <div
                className={`video-grid custom-scrollbar ${
                  callState.isVideoEnabled || remoteParticipants.some((p) => p.isVideoEnabled) ? 'both-videos-on' : ''
                }`}
              >
                {/* Local Video */}
                <div
                  className={`video-container local-video ${
                    callState.isScreenSharing ? 'shared-screen' : 'no-screen-shared'
                  }`}
                >
                  {callState.isScreenSharing && callState.screenShareStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="video-element cursor-pointer"
                    />
                  ) : callState.localStream && callState.localStream.getVideoTracks().length > 0 ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`video-element${!callState.isVideoEnabled ? ' video-disabled' : ''}`}
                      style={{ cursor: callState.isVideoEnabled ? 'pointer' : 'default' }}
                    />
                  ) : null}
                  {!callState.isVideoEnabled && !callState.isScreenSharing && (
                    <div className="video-placeholder">
                      {user?.avatar ? (
                        <Image src={ImageBaseUrl + user.avatar} alt={user.name} className="avatar-img" />
                      ) : (
                        <div
                          className="avatar-placeholder"
                          style={{ backgroundColor: user?.profile_color }}
                        >
                          {user?.name?.charAt(0)}
                        </div>
                      )}
                      {!callState.isAudioEnabled && <SvgIcon iconId="mic-off" className="muted-indicator" />}
                      {callState.callType === 'video' && !callState.isVideoEnabled && !callState.isScreenSharing && (
                        <SvgIcon iconId="video-off" className="video-off-indicator" />
                      )}
                    </div>
                  )}
                  <div className="video-overlay" style={{ display: 'block' }}>
                    <span className="participant-name">You {callState.isScreenSharing ? '(Screen Sharing)' : ''}</span>
                  </div>
                </div>

                {/* Remote Videos */}
                {remoteParticipants.map((participant) => (
                  <div  
                    key={participant.userId}
                    className={`video-container remote-video-${participant.userId} ${
                      participant.isScreenSharing ? 'shared-screen' : 'no-screen-shared'
                    }`}
                  >
                    {participant.stream && participant.stream.getVideoTracks().length > 0 ? (
                      <video
                        ref={(el) => {
                          if (el) {
                            remoteVideosRef.current.set(participant.userId, el)
                          }
                        }}
                        autoPlay
                        playsInline
                        className={`video-element${!participant.isVideoEnabled ? ' video-disabled' : ''}`}
                        style={{ cursor: participant.isVideoEnabled ? 'pointer' : 'default' }}
                      />
                    ) : null}
                    {(!participant.isVideoEnabled || !participant.stream?.getVideoTracks().length) && (
                      <div className="video-placeholder">
                        {participant?.avatar ? (
                          <Image src={ImageBaseUrl + participant.avatar} alt={participant.name} className="avatar-img" />
                        ) : (
                          <div
                            className="avatar-placeholder"
                            style={{ backgroundColor: participant?.profile_color }}
                          >
                            {participant?.name?.charAt(0)}
                          </div>
                        )}
                        {!participant.isAudioEnabled && <SvgIcon iconId="mic-off" className="muted-indicator" />}
                        {callState.callType === 'video' && !participant.isVideoEnabled && (
                          <SvgIcon iconId="video-off" className="video-off-indicator" />
                        )}
                      </div>
                    )}
                    <div className="video-overlay" style={{ display: 'block' }}>
                      <span className="participant-name">
                        {participant.name} {participant.isScreenSharing ? '(Screen Sharing)' : ''}
                        {!participant.isAudioEnabled && (participant.isVideoEnabled || participant.isScreenSharing) && (
                          <SvgIcon iconId="mic-off" className="muted-indicator" />
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Audio Call UI */
              <div className="audio-call-ui">
                <div className="audio-participants custom-scrollbar-side-panel">
                  <div className="participant-avatar local">
                      <div className="avatar-circle" style={{ backgroundColor: user?.avatar ? 'transparent' : user?.profile_color }}>
                        {user?.avatar ? (
                          <Image src={ImageBaseUrl + user.avatar} alt={user.name} />
                        ) : (
                          user?.name?.charAt(0)
                        )}
                      </div>
                    <span className="participant-name">You</span>
                    {!callState.isAudioEnabled && (
                      <SvgIcon iconId="mic-off" className="muted-indicator" />
                    )}
                  </div>
                  {remoteParticipants.map((participant) => (
                    <div key={participant.userId} className="participant-avatar remote">
                      <div
                        className="avatar-circle"
                        style={{ backgroundColor: participant?.avatar ? 'transparent' : participant?.profile_color }}
                      >
                        {participant?.avatar ? (
                          <Image src={ImageBaseUrl + participant.avatar} alt={participant.name} />
                        ) : (
                          participant?.name?.charAt(0)
                        )}
                      </div>
                      <span className="participant-name">{participant.name}</span>
                      <audio
                        ref={(el) => {
                          if (el) {
                            remoteAudiosRef.current.set(participant.userId, el)
                          }
                        }}
                        autoPlay
                        playsInline
                        style={{ display: 'none' }}
                      />
                      {!participant.isAudioEnabled && <SvgIcon iconId="mic-off" className="muted-indicator" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <CallControls callState={callState} onClose={onClose} />
        </div>
      </ModalBody>
    </Modal>
  )
}

export default CallModal
