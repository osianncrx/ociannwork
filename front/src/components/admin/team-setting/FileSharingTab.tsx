import { useFormikContext } from 'formik'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { queries } from '../../../api'
import { SearchableSelectInput, TagInput, TextInput } from '../../../shared/form-fields'
import { OptionType, SingleTeam } from '../../../types'
import SpecifiedMembersModal from './SpecifiedMembersModal'
import { TeamRole } from '../../../constants'
import { TeamSettingsFormValues } from '../../../types/common'

const FileSharingTab = () => {
  const { t } = useTranslation()
  const { values, setFieldValue, touched, errors } = useFormikContext<TeamSettingsFormValues>()
  const [showModal, setShowModal] = useState(false)
  const { data: memberData } = queries.useGetTeamMembersList()
  const members = memberData?.members || []

  const permissionOptions: OptionType[] = [
    { value: 'all', label: t('anyone') },
    { value: TeamRole.Admin, label: t('only_admins') },
    { value: 'specified_members', label: t('specified_members') },
  ]

  const handleModalSave = (selectedMemberIds: (string | number)[]) => {
    setFieldValue('allowed_file_upload_member_ids', selectedMemberIds)
    setShowModal(false)
  }

  const handlePermissionChange = (selected: OptionType | OptionType[] | null) => {
    if (!selected || Array.isArray(selected)) {
      setFieldValue('file_sharing_access', '')
      return
    }

    const value = selected.value
    setFieldValue('file_sharing_access', value)

    if (value === 'specified_members') {
      setShowModal(true)
    }
  }

  const renderManageMembers = () => {
    if (values?.file_sharing_access !== 'specified_members') return null

    let selectedIds = values?.allowed_file_upload_member_ids

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

    const matchedMembers = selectedIds.filter((id: string | number) => members.some((member: SingleTeam) => member.id === id))

    const count = matchedMembers.length

    return (
      <p className="text-sm mt-2">
        {count > 0 ? (
          <span className="text-muted">
            {count} {t('users_allowed')}{' '}
            <span className="text-success cursor-pointer ps-2" onClick={() => setShowModal(true)} role="button">
              | {t('manage_members')}
            </span>
          </span>
        ) : (
          <span className="text-success cursor-pointer" onClick={() => setShowModal(true)} role="button">
            {t('manage_members')}
          </span>
        )}
      </p>
    )
  }
  return (
    <Container fluid>
      <SearchableSelectInput
        formGroupClass="margin-b-20"
        label={t('file_sharing_access')}
        helperText="file_sharing_access_helper"
        name="file_sharing_access"
        options={permissionOptions}
        value={permissionOptions.find((opt) => opt.value === values?.file_sharing_access) || null}
        onOptionChange={handlePermissionChange}
        error={errors.file_sharing_access as string}
        touched={touched.file_sharing_access as boolean}
        isClearable={false}
      />
      {renderManageMembers()}

      <TagInput
        formGroupClass="margin-b-20"
        helperText="allowed_file_types_helper"
        name="allowed_file_upload_types"
        placeholder={t('upload_types_placeholder')}
        label="allowed_file_upload_types"
      />

      <TextInput
        formGroupClass="margin-b-20"
        type="number"
        name="member_file_upload_limit_mb"
        label={t('member_file_upload_limit')}
        placeholder={t('member_file_upload_limit_placeholder')}
        min={0}
        error={errors.member_file_upload_limit_mb as string}
        touched={touched.member_file_upload_limit_mb as boolean}
      />
      <SpecifiedMembersModal isOpen={showModal} toggle={() => setShowModal(false)} onSave={handleModalSave} />
    </Container>
  )
}

export default FileSharingTab
