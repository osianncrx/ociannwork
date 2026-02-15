import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../../../api'
import { ChatType } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { useAppSelector } from '../../../../store/hooks'
import MuteChatModal from '../modals/MuteChat'

const Mute = () => {
  const { t } = useTranslation()
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { user } = useAppSelector((store) => store.auth)
  const [muteModal, setMuteModal] = useState(false)
  const isMyChat = selectedChat?.id === user?.id && selectedChat?.type !== ChatType.Channel
  const { mutate: unmuteChatMutate } = mutations.useUnmuteChat()

  const handleMuteClick = () => {
    setMuteModal(true)
  }

  const handleUnmuteClick = () => {
    if (!selectedChat) return

    unmuteChatMutate(
      {
        target_id: selectedChat.id,
        target_type: selectedChat.type,
      },
      // {
      //   onSuccess: () => {
      //     dispatch(unmuteChat({ target_id: selectedChat.id, target_type: selectedChat.type }))
      //   },
      // },
    )
  }

  return (
    <>
      {!isMyChat && (
        <button
          className="settings mute-chat "
          onClick={selectedChat.is_muted ? handleUnmuteClick : handleMuteClick}
          title={selectedChat.is_muted ? t('unmute_chat') : t('mute_chat')}
        >
          <SvgIcon className={selectedChat.is_muted ? 'fill-none' : ''} iconId={selectedChat.is_muted ? 'unmute' : 'mute-chat'} />
        </button>
      )}
      <MuteChatModal
        isOpen={muteModal}
        toggle={() => setMuteModal(false)}
        targetId={selectedChat?.id || ''}
        targetType={
          selectedChat?.type === ChatType.Channel
            ? ChatType.Channel
            : selectedChat?.type === ChatType.DM
              ? ChatType.DM
              : selectedChat?.type || ''
        }
        onMuteSuccess={() => setMuteModal(false)}
      />
    </>
  )
}

export default Mute
