import { ChatType, UserStatus, UserTeamStatus } from '../../../../constants'
import { SvgIcon } from '../../../../shared/icons'
import { useAppSelector } from '../../../../store/hooks'
import { RestrictChatWrapperProps } from '../../../../types'

const RestrictChatWrapper = ({ selectedChat, children }: RestrictChatWrapperProps) => {
  const { user } = useAppSelector((store) => store.auth)
  const isDeactivated =
    selectedChat.type === ChatType.DM &&
    selectedChat?.id != user?.id &&
    (selectedChat.team_member_status === UserTeamStatus.Deactivated || selectedChat?.status == UserStatus.Deactivated)
  const isDoNotDisturb = selectedChat?.id != user?.id && selectedChat.do_not_disturb

  if (isDeactivated) {
    return <div className="p-3 text-center text-sm text-white-500 deactivated">Can't chat with deactivated user</div>
  }

  return (
    <>
      {isDoNotDisturb && (
        <div className="p-2  text-center text-xs dnd-text">
          <SvgIcon className="common-svg-hw" iconId="dnd" />
          <span>This user is on Do Not Disturb mode and won't receive notifications</span>
        </div>
      )}
      {children}
    </>
  )
}

export default RestrictChatWrapper
