import { FC, JSX, useEffect, useMemo, useState } from 'react'
import { SOCKET } from '../../../../../constants'
import { socket } from '../../../../../services/socket-setup'
import { CallState, webrtcService } from '../../../../../services/webrtc.service'
import { SvgIcon } from '../../../../../shared/icons'
import { useAppSelector } from '../../../../../store/hooks'
import { MessageTypeProps } from '../../../../../types/common'
import { CallMetadata, UpdatedMessage } from '../../../../../types'
import { format } from 'date-fns'
import MessageReactions from '../message-reactions'
import { safeJsonParse } from '../../../utils/custom-functions'

const CallMessage: FC<MessageTypeProps> = (props) => {
  const { message, findMessageById } = props
  const { user } = useAppSelector((store) => store.auth)
  const [callState, setCallState] = useState<CallState>(webrtcService.getCallState())

  const fixMetadata = (meta: string | CallMetadata | undefined | null): CallMetadata => {
    if (!meta) return {}

    let parsedMeta: CallMetadata
    if (typeof meta === 'string') {
      try {
        parsedMeta = safeJsonParse(meta) as CallMetadata
      } catch {
        return {}
      }
    } else {
      parsedMeta = meta
    }

    const numericKeys = Object.keys(parsedMeta)
      .filter((k) => !isNaN(parseFloat(k)))
      .map(Number)
      .sort((a, b) => a - b)

    if (
      numericKeys.length > 0 &&
      numericKeys[0] === 0 &&
      numericKeys[numericKeys.length - 1] === numericKeys.length - 1
    ) {
      const originalStr = numericKeys.map((k) => parsedMeta[k]).join('')
      try {
        const originalMeta = safeJsonParse(originalStr) as CallMetadata
        const nonNumeric = Object.keys(parsedMeta).filter((k) => isNaN(parseFloat(k)))
        nonNumeric.forEach((k) => {
          originalMeta[k] = parsedMeta[k]
        })
        return originalMeta
      } catch (e) {
        console.error('Failed to reconstruct metadata', e)
        return parsedMeta
      }
    }
    return parsedMeta
  }

  const [localMetadata, setLocalMetadata] = useState(fixMetadata(message.metadata) || {})
  const callKind = localMetadata.call_kind || 'audio'
  const isChannelCall = !!message.channel_id
  const callId = localMetadata.call_id
  const callAcceptedTime = localMetadata.call_accepted_time

  const isActiveCall = useMemo(() => {
    return callState?.callId === callId
  }, [callState?.callId, callId])

  const actualCallStatus = useMemo(() => {
    if (isActiveCall) {
      return callState?.callStatus || 'idle'
    }
    if (localMetadata.call_status === 'ongoing') {
      return 'ongoing'
    }
    return 'ended'
  }, [isActiveCall, callState?.callStatus, localMetadata.call_status])

  const durationSec = localMetadata.duration_sec || null
  const recipientView = localMetadata.recipient_view || null
  const participantCount = localMetadata.participant_count || 1

  const isCurrentUserInCall = useMemo(() => {
    return callState?.callId === callId && callState?.isInCall
  }, [callState?.callId, callState?.isInCall, callId])

  // Track if current user has ever joined this call
  const hasUserEverJoinedThisCall = useMemo(() => {
    return !!localMetadata.accepted_users?.includes(user?.id)
  }, [localMetadata, user?.id])

  // Track individual duration for current user
  const [individualDuration, setIndividualDuration] = useState<number | null>(null)
  const [callDuration, setCallDuration] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = webrtcService.onStateChange((newState) => {
      setCallState(newState)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isCurrentUserInCall && callState?.individualJoinTime) {
      const updateIndividualDuration = () => {
        const now = new Date()
        let startTime: Date
        if (callState.isInitiator && callAcceptedTime) {
          startTime = new Date(callAcceptedTime)
        } else if (callState.individualJoinTime) {
          startTime = new Date(callState.individualJoinTime)
        } else {
          setIndividualDuration(null)
          return
        }

        const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        setIndividualDuration(Math.max(0, duration))
      }

      updateIndividualDuration()
      const interval = setInterval(updateIndividualDuration, 1000)
      return () => clearInterval(interval)
    } else if (!isCurrentUserInCall) {
      setIndividualDuration(null)
    }
  }, [isCurrentUserInCall, callState?.individualJoinTime, callState?.isInitiator, callAcceptedTime])

  useEffect(() => {
    if (actualCallStatus === 'ongoing' && callAcceptedTime && isActiveCall) {
      const updateCallDuration = () => {
        const now = new Date()
        const acceptedTime = new Date(callAcceptedTime)
        const duration = Math.floor((now.getTime() - acceptedTime.getTime()) / 1000)
        setCallDuration(duration)
      }

      updateCallDuration()
      const interval = setInterval(updateCallDuration, 1000)
      return () => clearInterval(interval)
    } else {
      setCallDuration(null)
    }
  }, [actualCallStatus, callAcceptedTime, isActiveCall])

  useEffect(() => {
    const handleCallUpdate = (updatedMessage: UpdatedMessage) => {
      if (updatedMessage.id === message.id) {
        setLocalMetadata(fixMetadata(updatedMessage.metadata) || {})
      }
    }

    socket.on(SOCKET.Listeners.Message_Updated, handleCallUpdate)
    return () => {
      socket.off(SOCKET.Listeners.Message_Updated, handleCallUpdate)
    }
  }, [message.id])

  useEffect(() => {
    const handleCallEnded = (data: { callId: string }) => {
      if (data.callId === callId) {
        setLocalMetadata((prev: CallMetadata) => ({
          ...prev,
          call_status: 'ended',
          duration_sec: callDuration ?? prev.duration_sec ?? 0,
        }))
        setCallDuration(null)
        setIndividualDuration(null)
      }
    }

    socket.on('call-ended', handleCallEnded)
    return () => {
      socket.off('call-ended', handleCallEnded)
    }
  }, [callId, callDuration])

  useEffect(() => {
    if (!isActiveCall && localMetadata.call_status !== 'ended' && localMetadata.call_status !== 'ongoing') {
      if (callId) {
        const endedCalls = safeJsonParse(localStorage.getItem('endedCalls') || '{}')
        const savedDuration = endedCalls[callId]
        if (savedDuration !== undefined) {
          setLocalMetadata((prev: CallMetadata) => ({
            ...prev,
            call_status: 'ended',
            duration_sec: savedDuration,
            accepted_users:
              savedDuration >= 1 && user?.id && !prev.accepted_users?.includes(user.id)
                ? [...(prev.accepted_users || []), user.id]
                : prev.accepted_users,
          }))
        }
      }
    }
  }, [isActiveCall, localMetadata.call_status, callId, user?.id])

  const isCurrentUserSender = message.sender_id === user?.id

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCallStatusText = (): string | JSX.Element => {
    if (actualCallStatus === 'ongoing') {
      if (isCurrentUserInCall) {
        if (individualDuration !== null && individualDuration > 0) {
          return <>In Call • {formatDuration(individualDuration)}</>
        }
        return 'In Call'
      } else if (isChannelCall) {
        if (participantCount >= 2) {
          return 'Join Now'
        }
        return `In Call (${participantCount} participant${participantCount !== 1 ? 's' : ''})`
      } else {
        if (callDuration !== null && callDuration > 0) {
          return <>In Call • {formatDuration(callDuration)}</>
        }
        return 'In Call'
      }
    }

    if (actualCallStatus === 'connected') {
      if (isCurrentUserInCall) {
        if (individualDuration !== null && individualDuration > 0) {
          return <>In Call • {formatDuration(individualDuration)}</>
        }
        return 'In Call'
      } else if (callDuration !== null && callDuration > 0) {
        return <>In Call • {formatDuration(callDuration)}</>
      }
      return 'In Call'
    }

    if (actualCallStatus === 'calling') {
      if (isCurrentUserSender) {
        return 'Calling...'
      } else {
        return 'Incoming call'
      }
    }

    if (actualCallStatus === 'ringing') {
      return 'Incoming call'
    }

    if (actualCallStatus === 'ended' && durationSec && durationSec >= 1 && hasUserEverJoinedThisCall) {
      return formatDuration(durationSec)
    }

    if (actualCallStatus === 'ended' && (!durationSec || durationSec <= 0 || !hasUserEverJoinedThisCall)) {
      if (isCurrentUserSender) {
        return 'No answer'
      } else {
        return 'Missed call'
      }
    }

    if (recipientView === 'missed' || localMetadata.call_status === 'missed') {
      if (isCurrentUserSender) {
        return 'No answer'
      } else {
        return 'Missed call'
      }
    }

    if (actualCallStatus === 'no_answer') {
      return isCurrentUserSender ? 'No answer' : 'Missed call'
    }

    return 'Call ended'
  }

  const getCallIcon = (): string => {
    if (actualCallStatus === 'ongoing' || actualCallStatus === 'connected') {
      return callKind === 'video' ? 'video-call' : 'voice-call'
    }

    if (actualCallStatus === 'calling' || actualCallStatus === 'ringing') {
      return callKind === 'video' ? 'video-call' : 'voice-call'
    }

    const isMissedCall =
      actualCallStatus === 'ended' &&
      (recipientView === 'missed' ||
        localMetadata.call_status === 'missed' ||
        !durationSec ||
        durationSec <= 0 ||
        !hasUserEverJoinedThisCall)

    if (isMissedCall) return 'missed-call'

    return callKind === 'video' ? 'video-call' : 'voice-call'
  }

  const getCallStatusClass = (): string => {
    if (actualCallStatus === 'ongoing' || actualCallStatus === 'connected') {
      if (isCurrentUserInCall) {
        return 'ongoing-call'
      }
      return 'joinable-call'
    }

    if (actualCallStatus === 'calling' || actualCallStatus === 'ringing') {
      return 'calling-status'
    }

    const isMissedCall =
      actualCallStatus === 'ended' &&
      (recipientView === 'missed' ||
        localMetadata.call_status === 'missed' ||
        !durationSec ||
        durationSec <= 0 ||
        !hasUserEverJoinedThisCall)

    if (isMissedCall) return 'missed-call'
    if (actualCallStatus === 'ended' && durationSec && durationSec >= 1) return 'answered-call'
    return 'no-answer-call'
  }

  const getCallTypeText = (): string => {
    return callKind === 'video' ? 'Video call' : 'Voice call'
  }

  const handleJoinCall = () => {
    if (isChannelCall && actualCallStatus === 'ongoing' && !isCurrentUserInCall) {
      socket.emit(SOCKET.Emitters.Rejoin_Call, {
        callId: callId,
        channelId: message.channel_id,
        user: {
          userId: user?.id,
          name: user?.name,
          avatar: user?.avatar,
          profile_color: user?.profile_color,
          callType: callKind,
        },
      })
    }
  }

  const shouldShowJoinButton =
    isChannelCall && actualCallStatus === 'ongoing' && !isCurrentUserInCall && participantCount >= 1

  const callStatusContent = shouldShowJoinButton ? (
    <button className="join-now-button" onClick={handleJoinCall}>
      Join Now ({participantCount} in call)
    </button>
  ) : typeof getCallStatusText() === 'string' ? (
    getCallStatusText()
  ) : (
    getCallStatusText()
  )

  return (
    <div className="call-width">
      <div
        className={`call-message ${getCallStatusClass()} ${shouldShowJoinButton ? 'clickable' : ''}`}
        onClick={shouldShowJoinButton ? handleJoinCall : undefined}
        style={shouldShowJoinButton ? { cursor: 'pointer' } : undefined}
      >
        <div className="call-message-content">
          <div className="call-icon-wrapper">
            <SvgIcon iconId={getCallIcon()} className="call-icon" />
          </div>
          <div className="call-details">
            <div className="call-type">{getCallTypeText()}</div>
            <div className="call-status">{callStatusContent}</div>
          </div>
        </div>
      </div>
      <span className="visible-chat-time">
        {message?.created_at && format(new Date(message.created_at), 'hh:mm a')}
      </span>
      {message?.reactions?.length > 0 && <MessageReactions message={message} findMessageById={findMessageById} />}
    </div>
  )
}

export default CallMessage
