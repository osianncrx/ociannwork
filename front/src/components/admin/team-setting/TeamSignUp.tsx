import { useFormikContext } from 'formik'
import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { SearchableSelectInput, SwitchInput, TagInput } from '../../../shared/form-fields'
import { TeamSettingsFormValues } from '../../../types/common'
import { OptionType } from '../../../types'

const TeamSignUp = () => {
  const { t } = useTranslation()
  const { values, setFieldValue, touched, errors } = useFormikContext<TeamSettingsFormValues>()

  const visibilityOptions: OptionType[] = [
    { label: t('team_visibility_private'), value: 'private' },
    { label: t('team_visibility_public'), value: 'public' },
  ]

  return (
    <Container fluid>
      <SearchableSelectInput
        helperText="team_visibility_helper"
        formGroupClass="margin-b-18"
        label={t('team_visibility')}
        name="visibility"
        options={visibilityOptions}
        value={values?.visibility ? visibilityOptions.find((opt) => opt.value === values.visibility) || null : null}
        onOptionChange={(selected) => {
          if (Array.isArray(selected) || !selected) {
            setFieldValue('visibility', '')
          } else {
            setFieldValue('visibility', selected.value)
          }
        }}
        touched={!!touched.visibility}
        error={typeof errors.visibility === 'string' ? errors.visibility : undefined}
        isSearchable={false}
        isClearable={false}
      />

      {values?.invite_only && (
        <>
          <TagInput
            formGroupClass="margin-b-20"
            helperText="approved_domain_helper."
            name="approved_domains"
            placeholder={t('upload_types_placeholder')}
            label="Approved Domains"
          />
          <SwitchInput
            helperText="block_other_domains_helper"
            formGroupClass="margin-b-20"
            name="block_all_other_domains"
            label={t('Block other domains')}
            onToggle={(checked) => setFieldValue('block_all_other_domains', checked)}
            checked={values?.block_all_other_domains}
            labelClass="mb-0"
          />
        </>
      )}

      <SwitchInput
        helperText="require_approval_to_join_helper"
        formGroupClass="margin-b-20"
        name="require_approval_to_join"
        label={t('require_join_approval')}
        onToggle={(checked) => setFieldValue('require_approval_to_join', checked)}
        checked={values?.require_approval_to_join}
        labelClass="mb-0"
      />
    </Container>
  )
}

export default TeamSignUp
