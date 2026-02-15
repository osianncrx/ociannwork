import { useTranslation } from 'react-i18next'
import { ChatType } from '../../../../constants'
import { webrtcService } from '../../../../services/webrtc.service'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { showPermissionModal } from '../../../../store/slices/teamSettingSlice'
import { usePlanFeatures } from '../../../../utils/hooks'

const Calling = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)
  const { teamSetting } = useAppSelector((store) => store.teamSetting)
  const { team } = useAppSelector((store) => store.team)
  const { allowsVideoCalls } = usePlanFeatures()
  const isMyChat = selectedChat?.id === user?.id && selectedChat?.type !== ChatType.Channel
  const isInCall = webrtcService.isInCall()

  const handleStartVideoCall = async () => {
    if (!selectedChat || !user || isInCall) return

    // Check if video calls are enabled in plan
    if (!allowsVideoCalls()) {
      dispatch(
        showPermissionModal({
          title: 'Feature Not Available',
          content: 'Video calls are not available in your current plan. Please upgrade to enable this feature.',
          variant: 'warning',
        }),
      )
      return
    }

    const chatType = selectedChat.type === ChatType.Channel ? ChatType.Channel : ChatType.DM
    await webrtcService.initiateCall(selectedChat?.id, selectedChat?.name, chatType, 'video', user, team?.id)
  }

  const handleStartAudioCall = async () => {
    if (!selectedChat || !user || isInCall) return
    const chatType = selectedChat.type === ChatType.Channel ? ChatType.Channel : ChatType.DM
    await webrtcService.initiateCall(selectedChat?.id, selectedChat?.name, chatType, 'audio', user, team?.id)
  }

  const isAudioCallEnabled = teamSetting?.audio_calls_enabled && !isMyChat
  const isVideoCallEnabled = teamSetting?.video_calls_enabled && !isMyChat && allowsVideoCalls()

  return (
    <>
      {isVideoCallEnabled && (
        <button
          className={`settings ${isInCall ? 'disabled' : ''}`}
          onClick={handleStartVideoCall}
          disabled={isInCall}
          title={t('start_video_call')}
        >
          <SvgIcon className="call-icon" iconId="video" />
        </button>
      )}
      {isAudioCallEnabled && (
        <button
          className={`settings ${isInCall ? 'disabled' : ''}`}
          onClick={handleStartAudioCall}
          disabled={isInCall}
          title={t('start_audio_call')}
        >
          <SvgIcon className="call-icon" iconId="call" />
        </button>
      )}
    </>
  )
}

export default Calling
