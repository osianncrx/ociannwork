import { Formik, Form as FormikForm } from 'formik'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Col, Container, Label, Row } from 'reactstrap'
import { mutations } from '../../../api'
import { ROUTES } from '../../../constants'
import { SolidButton } from '../../../shared/button'
import { CardWrapper } from '../../../shared/card'
import CheckboxInput from '../../../shared/form-fields/CheckboxInput'
import RadioWithTagInput from '../../../shared/form-fields/RadioWithTagInput'
import TextInput from '../../../shared/form-fields/TextInput'
import { useAppSelector } from '../../../store/hooks'
import { OptionType } from '../../../types'
import { CustomFieldsFormValues, FieldCondition } from '../../../types/common'
import { toaster } from '../../../utils/custom-functions'

const CreateCustomFieldForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const customFieldData = location.state?.customField
  const isEdit = !!customFieldData?.id
  const { userTeamData } = useAppSelector((store) => store.team)
  const { mutate: createCustomField, isPending } = mutations.useCreateCustomField()
  const { mutate: updateCustomField } = mutations.useCustomFieldUpdate()

  const [showParentConditions, setShowParentConditions] = useState(false)
  const [parentConditions, setParentConditions] = useState<
    { selectedField: OptionType | null; selectedValue: OptionType | null }[]
  >([{ selectedField: null, selectedValue: null }])

  const getSignupOptionType = () => {
    if (!customFieldData) return 'list'

    if (customFieldData.value && customFieldData.value.trim()) {
      return 'list'
    }

    if (customFieldData.user_ids || customFieldData.field_type === 'team_members') {
      return 'team_members'
    }

    return 'list'
  }

  const initialValues: CustomFieldsFormValues = {
    field_name: customFieldData?.field_name || '',
    description: customFieldData?.description || '',
    user_ids: customFieldData?.user_ids || '',
    parent_field_condition: customFieldData?.parent_field_condition || '',
    is_mandatory: customFieldData?.is_mandatory ?? false,
    is_user_editable: customFieldData?.is_user_editable ?? false,
    use_parent_condition: !!customFieldData?.parent_field_condition,
    approved_domains: (() => {
      const signupType = getSignupOptionType()
      if (signupType === 'list' && customFieldData?.value) {
        return [
          signupType,
          ...customFieldData.value
            .split(',')
            .map((v: string) => v.trim())
            .filter((v: string) => v),
        ]
      }
      return signupType
    })(),

    allow_custom_domains: customFieldData?.allow_custom_values ?? false,
    values: customFieldData?.value
      ? customFieldData.value
          .split(',')
          ?.map((v: string) => v.trim())
          .filter((v: string) => v)
      : [],
  }

  useEffect(() => {
    if (customFieldData?.parent_field_condition) {
      try {
        const parsed =
          typeof customFieldData.parent_field_condition === 'string'
            ? JSON.parse(customFieldData.parent_field_condition)
            : customFieldData.parent_field_condition

        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((cond: FieldCondition) => ({
            selectedField: { label: cond.field, value: cond.field },
            selectedValue: { label: cond.value, value: cond.value },
          }))
          setParentConditions(mapped)
          setShowParentConditions(true)
        }
      } catch (e) {
        console.error('Invalid JSON in parent_field_condition:', e)
      }
    }
  }, [customFieldData])

  const handleSubmit = (values: CustomFieldsFormValues) => {
    const parentConditionsFormatted =
      values.use_parent_condition && showParentConditions
        ? parentConditions
            .filter((cond) => cond.selectedField && cond.selectedValue)
            .map((cond) => ({
              field: cond.selectedField?.value,
              value: cond.selectedValue?.value,
            }))
        : []

    let payload: any = {
      field_name: values.field_name,
      description: values.description,
      is_mandatory: values.is_mandatory,
      is_user_editable: values.is_user_editable,
      parent_field_condition: parentConditionsFormatted.length > 0 ? parentConditionsFormatted : null,
      team_id: userTeamData?.team_id,
      user_id: userTeamData?.user_id,
      action: isEdit ? 'update' : 'create',
    }

    const selectedFieldType = Array.isArray(values.approved_domains)
      ? values.approved_domains[0]
      : values.approved_domains

    if (selectedFieldType === 'list') {
      const fieldValues = Array.isArray(values.approved_domains)
        ? values.approved_domains.slice(1)
        : values.values || []
      payload.value = fieldValues.join(',')
      payload.field_type = 'list'
      payload.allow_custom_values = values?.allow_custom_domains || false
    } else if (selectedFieldType === 'team_members') {
      payload.field_type = 'team_members'
      payload.user_ids = values.user_ids || ''
      payload.value = ''
    }

    const errorHandler = (error: any) => {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        (Array.isArray(error?.response?.data)
          ? error.response.data.map((e: any) => e?.message).join(', ')
          : 'An error occurred')

      toaster('error', errorMsg)
    }

    const successHandler = () => {
      toaster('success', isEdit ? 'Custom field updated successfully' : 'Custom field created successfully')
      navigate(ROUTES.ADMIN.CUSTOM_FIELDS)
    }

    if (isEdit) {
      updateCustomField(
        { id: customFieldData.id, ...payload },
        {
          onSuccess: successHandler,
          onError: errorHandler,
        },
      )
    } else {
      createCustomField(payload, {
        onSuccess: successHandler,
        onError: errorHandler,
      })
    }
  }

  return (
    <Container fluid>
      <CardWrapper heading={{ title: isEdit ? 'edit_custom_field' : 'create_custom_field' }}>
        <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
          {({ values }) => {
            useEffect(() => {
              setShowParentConditions(values.use_parent_condition || false)
              if (!values.use_parent_condition) {
                setParentConditions([{ selectedField: null, selectedValue: null }])
              }
            }, [values.use_parent_condition])

            return (
              <FormikForm className="login-form custom-field">
                <Row>
                  <Col md="6">
                    <TextInput
                      layout="vertical"
                      className="custom-input"
                      formGroupClass="margin-b-25"
                      label={t('give_your_field_a_name')}
                      name="field_name"
                      labelClass="margin-b-10"
                      placeholder={t('enter_name')}
                      onlyAlphabets
                      required
                    />

                    <TextInput
                      layout="vertical"
                      formGroupClass="margin-b-25"
                      labelClass="margin-b-10"
                      className="custom-input"
                      label={t('description_of_the_field')}
                      name="description"
                      placeholder={t('enter_description')}
                    />

                    <RadioWithTagInput
                      layout="vertical"
                      name="approved_domains"
                      label="Values"
                      radioOptions={[
                        {
                          value: 'list',
                          label: 'Provide a list of values from which to select.',
                          showTagInput: true,
                          checkboxAbove: {
                            show: false,
                          },
                          checkboxBelow: {
                            name: 'allow_custom_domains',
                            label: 'Allow users to enter custom values',
                            show: true,
                          },
                        },
                      ]}
                    />
                  </Col>

                  <Col md="6">
                    <Label className="form-label">{t('additional_parameters')}</Label>
                    <CheckboxInput
                      customClass
                      name="is_mandatory"
                      labelClass="custom-form-label"
                      label="filling_out_this_custom_field_is_compulsory_for_all_users"
                    />

                    <CheckboxInput
                      customClass
                      name="is_user_editable"
                      labelClass="custom-form-label"
                      label="let_users_change_this_value"
                    />
                  </Col>
                </Row>

                <div className="form-actions mt-3">
                  <SolidButton
                    loading={isPending}
                    title={isEdit ? 'update' : 'save'}
                    type="submit"
                    color="primary"
                    className="btn btn-primary"
                  />
                  <SolidButton
                    title="cancel"
                    color="outline-light"
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN.CUSTOM_FIELDS)}
                  />
                </div>
              </FormikForm>
            )
          }}
        </Formik>
      </CardWrapper>
    </Container>
  )
}

export default CreateCustomFieldForm
