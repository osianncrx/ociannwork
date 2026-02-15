import { FC, useEffect, useState } from 'react'
import { Button, Toast, ToastBody } from 'reactstrap'
import { ChatType } from '../../../constants'
import { CallState, webrtcService } from '../../../services/webrtc.service'
import { SvgIcon } from '../../../shared/icons'
import { CallNotificationProps } from '../../../types'

const CallNotification: FC<CallNotificationProps> = ({ isVisible, onAccept, onDecline, onEndAndAccept }) => {
  const [callState, setCallState] = useState<CallState>(webrtcService.getCallState())

  const isBusyWithIncomingCall = callState.isInCall && callState.waitingIncoming

  let displayedName = 'Caller'
  let callType = 'voice'

  if (isBusyWithIncomingCall && callState.waitingIncoming) {
    displayedName = callState.waitingIncoming.initiator.name
    callType = callState.waitingIncoming.callType
  } else if (callState.chatType === ChatType.DM && callState.participants && callState.participants.size > 0) {
    displayedName = Array.from(callState.participants.values())[0].name || 'Caller'
    callType = callState.callType
  } else if (callState.chatType === ChatType.Channel) {
    displayedName = callState.chatName || 'Channel'
    callType = callState.callType
  }

  // Get avatar initial
  let avatarInitial = 'U'
  if (isBusyWithIncomingCall && callState.waitingIncoming) {
    avatarInitial = callState.waitingIncoming.initiator.name?.charAt(0) || 'U'
  } else if (callState.participants.size > 0 && callState.chatType === ChatType.DM) {
    avatarInitial = Array.from(callState.participants.values())[0].name?.charAt(0) || 'U'
  } else if (callState.chatType === ChatType.Channel) {
    avatarInitial = callState.chatName?.charAt(0) || 'C'
  }

  useEffect(() => {
    const unsubscribe = webrtcService.onStateChange(setCallState)
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="call-notification-overlay">
      <Toast isOpen={isVisible} className="call-notification-toast">
        <ToastBody>
          <div className="incoming-call-notification">
            <div className="call-info">
              <div className="caller-avatar">{avatarInitial}</div>
              <div className="call-details">
                <h6>{displayedName}</h6>
                <span className="call-description">
                  {isBusyWithIncomingCall ? 'Incoming call while busy' : `Incoming ${callType} call`}
                </span>
              </div>
            </div>
            <div className="call-actions">
              {isBusyWithIncomingCall ? (
                <>
                  <div className="">
                    <Button
                      color="success"
                      size="sm"
                      onClick={onEndAndAccept}
                      title="End current call and accept new call"
                    >
                      <SvgIcon iconId="phone" />
                    </Button>
                  </div>
                  <Button color="danger" size="sm" onClick={onDecline} title="Decline incoming call">
                    <SvgIcon iconId="end-call-vc" />
                  </Button>
                </>
              ) : (
                <>
                  <Button color="success" size="sm" onClick={onAccept}>
                    <SvgIcon iconId="phone" />
                  </Button>
                  <Button color="danger" size="sm" onClick={onDecline}>
                    <SvgIcon iconId="end-call-vc" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </ToastBody>
      </Toast>
    </div>
  )
}

export default CallNotification
