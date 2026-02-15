import { useFormikContext } from 'formik'
import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { SwitchInput } from '../../../shared/form-fields'
import { TeamSettingsFormValues } from '../../../types/common'

const PermissionsTab = () => {
  const { t } = useTranslation()
  const { values, setFieldValue } = useFormikContext<TeamSettingsFormValues>()

  return (
    <Container fluid>
      <SwitchInput
        helperText="invite_only_helper"
        formGroupClass="margin-b-20"
        name="invite_only"
        label={t('restricted_access')}
        onToggle={(checked) => setFieldValue('invite_only', checked)}
        checked={values?.invite_only}
        labelClass="mb-0"
      />
    </Container>
  )
}

export default PermissionsTab
