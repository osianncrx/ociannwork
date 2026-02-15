import { Form, Formik } from 'formik'
import { useState } from 'react'
import { Accordion, AccordionBody, AccordionHeader, AccordionItem, Col, Container, Row } from 'reactstrap'
import { mutations, queries } from '../../../api'
import { FALLBACKS, TeamRole } from '../../../constants'
import { SolidButton } from '../../../shared/button'
import { CardWrapper } from '../../../shared/card'
import { TeamSettingFormValues } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import { usePlanFeatures } from '../../../utils/hooks'
import ChannelManagement from './ChannelManagement'
import E2EEncryptionTab from './E2EEncryptionTab'
import FileSharingTab from './FileSharingTab'
import GeneralTab from './GeneralTab'
import InviteMembers from './InviteMembers'
import NotificationAndMessageTab from './NotificationAndMessageTab'
import PermissionsTab from './PermissionsTab'
import TeamSignUp from './TeamSignUp'

const TeamSetting = () => {
  const [open, setOpen] = useState<string>('1')
  const { data } = queries.useGetTeamSetting()
  const { mutate, isPending } = mutations.useUpdateTeamSetting()
  const { allowsFileSharing } = usePlanFeatures()

  const handleSubmit = (values: TeamSettingFormValues) => {
    mutate(values, {
      onSuccess: () => {
        toaster('success', 'Team Settings updated successfully')
      },
    })
  }
  const toggle = (id: string) => {
    setOpen(open === id ? '' : id)
  }

  return (
    <Formik<TeamSettingFormValues>
      enableReinitialize
      initialValues={{
        // general tab
        timezone: data?.teamSetting?.timezone || 'UTC',
        visibility: data?.teamSetting?.visibility || 'public',
        direct_join_enabled: data?.teamSetting?.direct_join_enabled || false,
        // permissions tab
        invitation_permission: data?.teamSetting?.invitation_permission || TeamRole.Admin,
        require_approval_to_join: data?.teamSetting?.require_approval_to_join || false,
        public_channel_creation_permission: data?.teamSetting?.public_channel_creation_permission || 'all',
        private_channel_creation_permission: data?.teamSetting?.private_channel_creation_permission || TeamRole.Admin,
        allowed_public_channel_creator_ids: data?.teamSetting?.allowed_public_channel_creator_ids || [],
        allowed_private_channel_creator_ids: data?.teamSetting?.allowed_private_channel_creator_ids || [],
        invite_only: data?.teamSetting?.invite_only || true,
        approved_domains: data?.teamSetting?.approved_domains || [],
        block_all_other_domains: data?.teamSetting?.block_all_other_domains || false,
        channel_creation_limit_per_user: data?.teamSetting?.channel_creation_limit_per_user || 20,
        members_can_create_channels: data?.teamSetting?.members_can_create_channels || false,
        display_full_names: data?.teamSetting?.display_full_names || false,
        auto_joined_channel: data?.teamSetting?.auto_joined_channel || null,
        // Messages tab
        email_notifications_enabled: data?.teamSetting?.email_notifications_enabled || true,
        message_retention_days: data?.teamSetting?.message_retention_days || 90,
        notifications_default: data?.teamSetting?.notifications_default || 'all',
        // File sharing tab
        file_sharing_access: data?.teamSetting?.file_sharing_access || TeamRole.Admin,
        file_sharing_type_scope: data?.teamSetting?.file_sharing_type_scope || 'all',
        allowed_file_upload_types: data?.teamSetting?.allowed_file_upload_types || [],
        allowed_file_upload_member_ids: data?.teamSetting?.allowed_file_upload_member_ids || [],
        team_file_upload_limit_mb: data?.teamSetting?.team_file_upload_limit_mb || 1000,
        member_file_upload_limit_mb: data?.teamSetting?.member_file_upload_limit_mb || 100,
        // General tab
        audio_calls_enabled: data?.teamSetting?.audio_calls_enabled || FALLBACKS.AudioCalls,
        video_calls_enabled: data?.teamSetting?.video_calls_enabled || FALLBACKS.VideoCalls,
        audio_messages_enabled: data?.teamSetting?.audio_messages_enabled || FALLBACKS.AudioMessages,
        screen_sharing_in_calls_enabled: data?.teamSetting?.screen_sharing_in_calls_enabled || FALLBACKS.ScreenSharing,
        maximum_message_length: data?.teamSetting?.maximum_message_length || FALLBACKS.MaxMessageLength,
        default_theme_mode: data?.teamSetting?.default_theme_mode || FALLBACKS.DefaultThemeMode,
      }}
      onSubmit={handleSubmit}
    >
      {() => (
        <Container fluid>
          <Row>
            <Col xl="12">
              <CardWrapper
                heading={{
                  title: 'team_permissions',
                }}
              >
                <Form className="login-form vertical-tabs ">
                  <Row>
                    <Col xl="6">
                      <Accordion open={open} toggle={toggle}>
                        <AccordionItem>
                          <AccordionHeader targetId="1">Invite Members</AccordionHeader>
                          <AccordionBody accordionId="1">
                            <InviteMembers />
                          </AccordionBody>
                        </AccordionItem>

                        <AccordionItem>
                          <AccordionHeader targetId="2">Team sign up permissions</AccordionHeader>
                          <AccordionBody accordionId="2">
                            <TeamSignUp />
                          </AccordionBody>
                        </AccordionItem>

                        <AccordionItem>
                          <AccordionHeader targetId="4">Channel Management</AccordionHeader>
                          <AccordionBody accordionId="4">
                            <ChannelManagement />
                          </AccordionBody>
                        </AccordionItem>

                        <AccordionItem>
                          <AccordionHeader targetId="5">Permissions</AccordionHeader>
                          <AccordionBody accordionId="5">
                            <PermissionsTab />
                          </AccordionBody>
                        </AccordionItem>
                      </Accordion>
                    </Col>
                    <Col xl="6">
                      <Accordion open={open} toggle={toggle}>
                        {allowsFileSharing() && (
                          <AccordionItem>
                            <AccordionHeader targetId="6">File sharing permissions</AccordionHeader>
                            <AccordionBody accordionId="6">
                              <FileSharingTab />
                            </AccordionBody>
                          </AccordionItem>
                        )}

                        <AccordionItem>
                          <AccordionHeader targetId="7">Notifications & Messages</AccordionHeader>
                          <AccordionBody accordionId="7">
                            <NotificationAndMessageTab />
                          </AccordionBody>
                        </AccordionItem>
                        <AccordionItem>
                          <AccordionHeader targetId="8">General</AccordionHeader>
                          <AccordionBody accordionId="8">
                            <GeneralTab />
                          </AccordionBody>
                        </AccordionItem>
                        <AccordionItem>
                          <AccordionHeader targetId="9">E2E Encryption</AccordionHeader>
                          <AccordionBody accordionId="9">
                            <E2EEncryptionTab />
                          </AccordionBody>
                        </AccordionItem>
                      </Accordion>
                    </Col>
                    <div className="form-actions">
                      <SolidButton loading={isPending} color="primary" title="submit" type="submit" />
                    </div>
                  </Row>
                </Form>
              </CardWrapper>
            </Col>
          </Row>
        </Container>
      )}
    </Formik>
  )
}

export default TeamSetting
