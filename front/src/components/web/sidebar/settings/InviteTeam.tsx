import { useState } from 'react'
import { SvgIcon } from '../../../../shared/icons'
import { useTeamPermissions } from '../../../../utils/hooks'
import InviteMembersModal from './InviteMembersModal'

const InviteTeam = () => {
  const [inviteMembersModal, setInviteMembersModal] = useState(false)
  const [, setDropdownOpen] = useState(false)
  const { checkPermission } = useTeamPermissions()

  const handleInviteMembersClick = () => {
    const hasPermission = checkPermission('invite_member', {
      title: 'Permiso Requerido',
      content: 'Solo los admins pueden invitar nuevos miembros al equipo.',
      variant: 'warning',
    })

    if (hasPermission) {
      setInviteMembersModal(true)
      setDropdownOpen(false)
    }
  }

  return (
    <>
      <li className="chat-item" onClick={handleInviteMembersClick}>
        <SvgIcon className="common-svg-hw dnd" iconId="invite-team" />
        Invitar al Equipo
      </li>
      <InviteMembersModal isOpen={inviteMembersModal} toggle={() => setInviteMembersModal(false)} />
    </>
  )
}

export default InviteTeam
