import { useFormikContext } from 'formik'
import { useTranslation } from 'react-i18next'
import { FormGroup, InputGroup } from 'reactstrap'
import { queries } from '../../../api'
import { SearchableSelectInput } from '../../../shared/form-fields'
import { SimpleModal } from '../../../shared/modal'
import { OptionType, SingleTeam } from '../../../types'
import { TeamSettingsFormValues } from '../../../types/common'
import { SpecifiedMembersModalProps } from '../../../types'

const SpecifiedMembersModal = ({ isOpen, toggle, onSave, type }: SpecifiedMembersModalProps) => {
  const { t } = useTranslation()
  const { values, setFieldValue } = useFormikContext<TeamSettingsFormValues>()
  const { data, isLoading } = queries.useGetTeamMembersList()

  const members = data?.members || []
  const idsField = type === 'public' ? 'allowed_public_channel_creator_ids' : 'allowed_private_channel_creator_ids'

  let selectedIds: (string | number)[] = values?.[idsField] || []
  if (typeof selectedIds === 'string') {
    try {
      selectedIds = JSON.parse(selectedIds)
    } catch {
      selectedIds = []
    }
  }

  const memberOptions: OptionType[] = members.map((member: SingleTeam) => ({
    label: member.name || member.email,
    value: member.id,
  }))

  const selectedMemberOptions: OptionType[] = memberOptions.filter((opt) => selectedIds.includes(opt.value))

  const handleChange = (selected: OptionType | OptionType[] | null) => {
    const selectedArray = Array.isArray(selected) ? selected : selected ? [selected] : []
    const selectedIds = selectedArray.map((opt) => opt.value)
    setFieldValue(idsField, selectedIds)
  }

  const handleSubmit = async () => {
    try {
      await onSave(values[idsField] || [])
    } catch (error) {
      console.error('Error saving members:', error)
    }
  }

  const title = type === 'public' ? t('add_public_channel_creators') : t('add_private_channel_creators')

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={toggle}
      title={title}
      centered
      scrollable={false}
      loading={isLoading}
      bodyClassName="p-3"
      footerJustify="end"
      actions={[
        {
          title: 'cancel',
          color: 'light',
          onClick: toggle,
          autoClose: false,
          className: 'w-100',
        },
        {
          title: 'save',
          color: 'secondary',
          onClick: handleSubmit,
          className: 'w-100',
        },
      ]}
    >
      <div className="mb-3">
        <label className="form-label fw-medium mb-2">{t('team_members_name_email')}</label>

        <FormGroup className="mb-0">
          <InputGroup className="gap-2 flex-nowrap align-items-start">
            <SearchableSelectInput
              layout="vertical"
              name={idsField}
              options={memberOptions}
              value={selectedMemberOptions}
              isMulti
              isClearable={false}
              showAddButton
              onAddClick={(option) => {
                if (!selectedIds.includes(option.value)) {
                  setFieldValue(idsField, [...selectedIds, option.value])
                }
              }}
              placeholder={t('enter_name_or_email')}
              formGroupClass="w-100"
              onOptionChange={handleChange}
            />
          </InputGroup>
        </FormGroup>
      </div>

      <p className="text-muted small mb-0">
        <i className="fas fa-lightbulb me-1"></i>
        {t('channel_creation_permission_note')}
      </p>
    </SimpleModal>
  )
}

export default SpecifiedMembersModal
