import { useFormikContext } from 'formik'
import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { TeamRole } from '../../../constants'
import { SearchableSelectInput } from '../../../shared/form-fields'
import { OptionType } from '../../../types'
import { TeamSettingsFormValues } from '../../../types/common'

const InviteMembers = () => {
  const { t } = useTranslation()
  const { values, setFieldValue, touched, errors } = useFormikContext<TeamSettingsFormValues>()

  const notificationOptions: OptionType[] = [
    { label: t('Only Admins'), value: TeamRole.Admin },
    { label: t('All team members (excluding the guest)'), value: 'all' },
  ]

  return (
    <Container fluid>
      <SearchableSelectInput
        helperText="invite_permission_helper"
        formGroupClass="margin-b-20"
        label={t('invite_permissions')}
        name="invitation_permission"
        options={notificationOptions}
        value={
          values?.invitation_permission
            ? notificationOptions.find((opt) => opt.value === values?.invitation_permission) || null
            : null
        }
        onOptionChange={(option) => {
          if (!Array.isArray(option)) {
            setFieldValue('invitation_permission', option?.value || '')
          }
        }}
        error={typeof errors.invitation_permission === 'string' ? errors.invitation_permission : undefined}
        touched={!!touched.invitation_permission}
        isSearchable={false}
        isClearable={false} 
      />
    </Container>
  )
}

export default InviteMembers
