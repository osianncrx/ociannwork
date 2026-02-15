import { useState } from 'react'
import { FormGroup, Input } from 'reactstrap'
import { mutations } from '../../../../api'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { updateDndState } from '../../../../store/slices/teamSlice'
import DoNotDisturbModal from '../../chat/modals/DoNotDisturb'

const DoNotDisturb = () => {
  const { userTeamData } = useAppSelector((store) => store.team)
  const doNotDisturb = userTeamData?.do_not_disturb || false
  const [doNotDisturbModal, setDoNotDisturbModal] = useState(false)
  const { mutate } = mutations.useDoNotDisturb()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((s) => s.auth)
  const { team } = useAppSelector((s) => s.team)

  const handleDoNotDisturbToggle = () => {
    if (doNotDisturb) {
      mutate(
        {
          value: false,
        },
        {
          onSuccess: () => {
            if (user?.id) {
              dispatch(
                updateDndState({
                  userId: user.id,
                  teamId: team?.id || userTeamData?.team_id || '',
                  do_not_disturb: false,
                  do_not_disturb_until: null,
                }),
              )
            }
          },
        },
      )
    } else if (!doNotDisturb) setDoNotDisturbModal(!doNotDisturbModal)
  }

  return (
    <>
      <li className="chat-item" onClick={handleDoNotDisturbToggle}>
        <SvgIcon className="common-svg-hw dnd" iconId="dnd" />
        Do Not Disturb
        <FormGroup switch>
          <Input type="switch" checked={doNotDisturb} onChange={handleDoNotDisturbToggle} />
        </FormGroup>
      </li>
      <DoNotDisturbModal
        isOpen={doNotDisturbModal}
        toggle={() => setDoNotDisturbModal(!doNotDisturbModal)}
        toggleModal={() => setDoNotDisturbModal(false)}
      />
    </>
  )
}

export default DoNotDisturb
