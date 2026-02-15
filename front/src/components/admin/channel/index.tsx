import { Col, Container, Row } from 'reactstrap'
import { CardWrapper } from '../../../shared/card'
import ChannelTable from './ChannelTable'
import { SolidButton } from '../../../shared/button'
import { SvgIcon } from '../../../shared/icons'
import { useTranslation } from 'react-i18next'
import { useTeamPermissions } from '../../../utils/hooks'
import { useState } from 'react'
import CreateChannel from '../../web/sidebar/modals/CreateChannel'

const ManageChannel = () => {
  const { t } = useTranslation()
  const { checkPermission } = useTeamPermissions()
  const [createChannelModal, setCreateChannelModal] = useState(false)

  const handleCreateChannelClick = () => {
    const hasPermission = checkPermission('create_public_channel', {
      title: t('Permission Required'),
      content: t('Only admins or specified members can create channels.'),
      variant: 'warning',
    })

    if (hasPermission) {
      setCreateChannelModal(true)
    }
  }

  const CreateChannelButton = () => (
    <SolidButton type="button" onClick={handleCreateChannelClick} className="btn-outline-primary">
      <SvgIcon className="editor-svg-hw" iconId="plus-icon" />
      {t('add_channel')}
    </SolidButton>
  )
  
  return (
    <Container fluid>
      <Row>
        <Col xl="12" className="custom-manage-teams">
          <CardWrapper
            heading={{
              title: 'manage_channels',
              headerChildren: <CreateChannelButton />,
            }}
            className="manage-card-header"
          >
            <ChannelTable />
          </CardWrapper>
          <CreateChannel createChannelModal={createChannelModal} setCreateChannelModal={setCreateChannelModal} />
        </Col>
      </Row>
    </Container>
  )
}

export default ManageChannel
