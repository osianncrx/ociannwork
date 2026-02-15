import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SvgIcon } from '../../../../shared/icons'
import { useTeamPermissions } from '../../../../utils/hooks'
import InviteMembersModal from './InviteMembersModal'

const InviteTeam = () => {
  const [inviteMembersModal, setInviteMembersModal] = useState(false)
  const [, setDropdownOpen] = useState(false)
  const { t } = useTranslation()
  const { checkPermission } = useTeamPermissions()

  const handleInviteMembersClick = () => {
    const hasPermission = checkPermission('invite_member', {
      title: t('Permission Required'),
      content: t('Only admins can invite new members to the team.'),
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
        Invite Team
      </li>
      <InviteMembersModal isOpen={inviteMembersModal} toggle={() => setInviteMembersModal(false)} />
    </>
  )
}

export default InviteTeam
