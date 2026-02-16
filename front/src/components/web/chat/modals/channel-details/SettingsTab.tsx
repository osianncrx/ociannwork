import { useState } from 'react'
import { mutations } from '../../../../../api'
import { ChannelRole } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { ConfirmModal } from '../../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks'
import { removeChannelFromChats, selectChat } from '../../../../../store/slices/chatSlice'
import { ChannelMember, ExtendedChatItem } from '../../../../../types'

const SettingsTab = ({ setDetailModal }: { setDetailModal: (val: boolean) => void }) => {
  const { selectedChat } = useAppSelector((store) => store.chat)
  const { currentChannel } = useAppSelector((store) => store.channel)
  const { user: userData } = useAppSelector((store) => store.auth)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const { mutate: deleteChannelMutate, isPending: isDeleting } = mutations.useDeleteChannel()
  const dispatch = useAppDispatch()

  const isCurrentUserAdmin = currentChannel?.members?.find(
    (member: ChannelMember) => member.user_id === userData?.id && member?.role === ChannelRole.Admin,
  )

  const handleDeleteChannel = () => {
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!selectedChat?.id) return

    deleteChannelMutate(
      { ids: [selectedChat.id] },
      {
        onSuccess: () => {
          dispatch(removeChannelFromChats({ channelId: selectedChat.id }))
          dispatch(selectChat(null as unknown as ExtendedChatItem))
          setDetailModal(false)
          setConfirmDeleteOpen(false)
        },
        onError: () => {
          setConfirmDeleteOpen(false)
        },
      },
    )
  }

  return (
    <>
      <div className="settings-section">
        {isCurrentUserAdmin && (
          <div className="d-flex align-items-center justify-content-between p-3 danger-zone">
            <div className="d-flex align-items-center">
              <SvgIcon iconId="trash-icon" className="common-svg-hw me-2 text-danger" />
              <div>
                <div className="text-danger fw-medium">Eliminar este canal</div>
                <small className="text-muted">Esta acción no se puede deshacer. Todos los mensajes se perderán.</small>
              </div>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={handleDeleteChannel} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar Canal'}
            </button>
          </div>
        )}
      </div>
      <ConfirmModal
        isLoading={isDeleting}
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="¿Estás seguro de que quieres eliminar este canal?"
        subtitle="Esta acción no se puede deshacer. Todos los mensajes, archivos e historial del canal se eliminarán permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        showIcon={true}
        iconId="trash-icon"
      />
    </>
  )
}

export default SettingsTab
