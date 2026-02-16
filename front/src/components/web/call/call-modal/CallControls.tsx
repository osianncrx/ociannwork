import { useMemo } from 'react'
import { Button } from 'reactstrap'
import { CallParticipant, CallState, webrtcService } from '../../../../services/webrtc.service'
import { SvgIcon } from '../../../../shared/icons'
import { useAppSelector } from '../../../../store/hooks'

interface CallControlsProps {
  callState: CallState
  onClose: () => void
  participants?: Map<string, CallParticipant>
}

const CallControls = ({ callState, onClose, participants }: CallControlsProps) => {
  const { teamSetting } = useAppSelector((store) => store.teamSetting)
  const { user } = useAppSelector((store) => store.auth)

  const handleToggleVideo = async () => {
    await webrtcService.toggleVideo()
  }

  const handleToggleAudio = async () => {
    await webrtcService.toggleAudio()
  }

  const handleStartScreenShare = async () => {
    await webrtcService.startScreenShare()
  }

  const handleStopScreenShare = async () => {
    await webrtcService.stopScreenShare()
  }

  const handleAcceptCall = async () => {
    if (user) {
      await webrtcService.acceptCall(callState.callId!, user)
    }
  }

  const handleDeclineCall = async () => {
    await webrtcService.declineCall(callState.callId!)
    onClose()
  }

  const handleEndCall = async () => {
    await webrtcService.endCall()
    onClose()
  }

  const remoteScreenSharer = useMemo(() => {
    if (!participants || !user?.id) return null
    return Array.from(participants.values()).find(
      (p) => p.userId !== user.id && p.isScreenSharing,
    ) || null
  }, [participants, user?.id])

  const handleRequestRemoteControl = () => {
    if (remoteScreenSharer) {
      webrtcService.requestRemoteControl(remoteScreenSharer.userId)
    }
  }

  const handleStopRemoteControl = () => {
    webrtcService.stopRemoteControl()
  }

  const rc = callState.remoteControl
  const isControlling = rc.isActive && rc.targetUserId !== null
  const isBeingControlled = rc.isActive && rc.controllerUserId !== null

  return (
    <div className="call-controls">
      {callState.callStatus === 'ringing' && !callState.isInitiator ? (
        /* Incoming Call Controls */
        <div className="incoming-call-controls">
          <Button color="success" size="lg" onClick={handleAcceptCall} className="control-btn accept-btn">
            <SvgIcon iconId="phone" />
          </Button>
          <Button color="danger" size="lg" onClick={handleDeclineCall} className="control-btn decline-btn">
            <SvgIcon iconId="end-call-vc" className='common-svg-hw' />
          </Button>
        </div>
      ) : (
        /* Active Call Controls */
        <div className="active-call-controls">
          <Button
            color={callState.isAudioEnabled ? 'button-glass' : 'danger'}
            onClick={handleToggleAudio}
            className="control-btn"
            title={callState.isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            <SvgIcon iconId={callState.isAudioEnabled ? 'mic' : 'mic-off'} />
          </Button>

          {callState.callType === 'video' && (
            <Button
              color={callState.isVideoEnabled ? 'primary' : 'danger'}
              onClick={handleToggleVideo}
              className="control-btn"
              title={callState.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <SvgIcon iconId={callState.isVideoEnabled ? 'video' : 'video-off'} />
            </Button>
          )}

          {teamSetting?.screen_sharing_in_calls_enabled &&
            callState.callStatus === 'connected' &&
            callState.callType === 'video' && (
              <Button
                color="button-glass"
                onClick={callState.isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
                className="control-btn"
                title={callState.isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <SvgIcon iconId={callState.isScreenSharing ? 'monitor-off' : 'monitor'} />
              </Button>
            )}

          {/* Remote Control Button */}
          {callState.callStatus === 'connected' && callState.callType === 'video' && (
            <>
              {(isControlling || isBeingControlled) ? (
                <Button
                  color="danger"
                  onClick={handleStopRemoteControl}
                  className="control-btn rc-active-btn"
                  title="Stop remote control"
                  style={{ position: 'relative' }}
                >
                  <span style={{ fontSize: 16 }}>🖱️</span>
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid var(--card-bg, #1a1a2e)',
                    }}
                  />
                </Button>
              ) : remoteScreenSharer && !callState.isScreenSharing ? (
                <Button
                  color="button-glass"
                  onClick={handleRequestRemoteControl}
                  className="control-btn"
                  title={`Request remote control of ${remoteScreenSharer.name}'s screen`}
                >
                  <span style={{ fontSize: 16 }}>🖱️</span>
                </Button>
              ) : null}
            </>
          )}

          <Button color="danger" onClick={handleEndCall} className="control-btn end-call-btn" title="End call">
            <SvgIcon iconId="end-call-vc" className='common-svg-hw' />
          </Button>
        </div>
      )}
    </div>
  )
}

export default CallControls
