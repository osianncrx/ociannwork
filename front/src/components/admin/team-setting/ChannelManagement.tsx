import { useField, useFormikContext } from 'formik'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { queries } from '../../../api'
import { TeamRole } from '../../../constants'
import { SearchableSelectInput, TextInput } from '../../../shared/form-fields'
import { OptionType, SingleTeam } from '../../../types'
import { TeamSettingsFormValues } from '../../../types/common'
import SpecifiedMembersModal from './SpecifiedMembersModal'

const ChannelManagement = () => {
  const { t } = useTranslation()
  const { values, setFieldValue, touched, errors } = useFormikContext<TeamSettingsFormValues>()
  const { data: memberData } = queries.useGetTeamMembersList()
  const members: SingleTeam[] = memberData?.members || []
  const [selectedChannels, setSelectedChannels] = useState<OptionType[]>([])
  const { data } = queries.useGetChannelsByTeam()

  const [publicField] = useField('public_channel_creation_permission')
  const [privateField] = useField('private_channel_creation_permission')

  const [modalType, setModalType] = useState<'public' | 'private' | null>(null)

  const channelOptions: OptionType[] =
    data?.channels?.map((item) => ({
      label: item.name,
      value: item.id,
    })) || []

  useEffect(() => {
    if (values.auto_joined_channel && channelOptions.length > 0) {
      let channelIds: (string | number)[] = []

      if (typeof values.auto_joined_channel === 'string') {
        try {
          channelIds = JSON.parse(values.auto_joined_channel)
        } catch {
          channelIds = []
        }
      } else if (Array.isArray(values.auto_joined_channel)) {
        channelIds = values.auto_joined_channel
      }

      const selected = channelOptions.filter((option) => channelIds.some((id) => String(id) === String(option.value)))

      if (selected.length > 0) {
        setSelectedChannels(selected)
      }
    }
  }, [values.auto_joined_channel, channelOptions.length])

  const handleChannelChange = (selected: OptionType[]) => {
    setSelectedChannels(selected)
    const channelIds = selected.map((channel) => channel.value)
    setFieldValue('auto_joined_channel', channelIds)
  }

  const permissionOptions: OptionType[] = [
    { value: 'all', label: 'Anyone' },
    { value: TeamRole.Admin, label: 'Only Admins' },
    { value: 'specified_members', label: 'Allow specific users and team admins' },
  ]

  const handlePermissionChange = (type: 'public' | 'private', option: OptionType | null) => {
    const value = option?.value || ''
    const fieldName = type === 'public' ? 'public_channel_creation_permission' : 'private_channel_creation_permission'
    setFieldValue(fieldName, value)

    if (value === 'specified_members') {
      setModalType(type)
    }
  }

  const handleModalSave = (selectedMemberIds: (string | number)[]) => {
    if (modalType === 'public') {
      setFieldValue('allowed_public_channel_creator_ids', selectedMemberIds)
    } else if (modalType === 'private') {
      setFieldValue('allowed_private_channel_creator_ids', selectedMemberIds)
    }
    setModalType(null)
  }

  const renderManageMembers = (type: 'public' | 'private') => {
    const fieldValue = type === 'public' ? publicField.value : privateField.value
    let selectedIds: (string | number)[] =
      type === 'public' ? values.allowed_public_channel_creator_ids : values.allowed_private_channel_creator_ids

    if (typeof selectedIds === 'string') {
      try {
        selectedIds = JSON.parse(selectedIds)
      } catch {
        selectedIds = []
      }
    }

    if (!Array.isArray(selectedIds)) {
      selectedIds = []
    }

    if (fieldValue !== 'specified_members') return null

    const matchedMembers = selectedIds.filter((id: string | number) =>
      members.some((member: SingleTeam) => member.id === id),
    )
    const count = matchedMembers.length

    return (
      <p className="text-sm mt-2">
        {count > 0 ? (
          <span className="text-muted">
            {count} {t('users_allowed')}
            <span className="text-success cursor-pointer ps-2" onClick={() => setModalType(type)} role="button">
              {t('manage_members')}
            </span>
          </span>
        ) : (
          <span className="text-success cursor-pointer" onClick={() => setModalType(type)} role="button">
            {t('manage_members')}
          </span>
        )}
      </p>
    )
  }
  return (
    <Container fluid>
      <SearchableSelectInput
        helperText="public_channel_creation_helper"
        formGroupClass="margin-b-20"
        label={t('public_channel_permission')}
        name="public_channel_creation_permission"
        options={permissionOptions}
        value={permissionOptions.find((opt) => opt.value === publicField.value) || null}
        onOptionChange={(opt) => {
          if (!Array.isArray(opt)) handlePermissionChange('public', opt)
        }}
        error={errors.public_channel_creation_permission as string}
        touched={touched.public_channel_creation_permission as boolean}
        isClearable={false}
        isMulti={false}
      />
      {renderManageMembers('public')}

      <SpecifiedMembersModal
        isOpen={modalType !== null}
        toggle={() => setModalType(null)}
        onSave={handleModalSave}
        type={modalType}
      />

      <TextInput
        formGroupClass="margin-b-20"
        helperText="channel_creation_limit_helper"
        type="number"
        name="channel_creation_limit_per_user"
        label={t('channel_creation_limit_per_user')}
        min={1}
        placeholder={t('enter_limit')}
      />

      <SearchableSelectInput
        name="auto_joined_channel"
        label={t('auto_joined_channel')}
        placeholder="Select channel..."
        isMulti={true}
        closeMenuOnSelect={false}
        options={channelOptions}
        value={selectedChannels}
        onOptionChange={(selected) => {
          if (Array.isArray(selected)) {
            handleChannelChange(selected as OptionType[])
          }
        }}
      />
    </Container>
  )
}

export default ChannelManagement
