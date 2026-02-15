import { Button } from 'reactstrap'
import { CallState, webrtcService } from '../../../../services/webrtc.service'
import { SvgIcon } from '../../../../shared/icons'
import { useAppSelector } from '../../../../store/hooks'

const CallControls = ({ callState, onClose }: { callState: CallState; onClose: () => void }) => {
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
          <Button color="danger" onClick={handleEndCall} className="control-btn end-call-btn" title="End call">
            <SvgIcon iconId="end-call-vc" className='common-svg-hw' />
          </Button>
        </div>
      )}
    </div>
  )
}

export default CallControls
