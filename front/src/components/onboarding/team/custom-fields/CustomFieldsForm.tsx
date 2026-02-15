import { Form, Formik, FormikErrors, FormikTouched } from 'formik'
import { FC, useEffect, useState } from 'react'
import { Col, Row } from 'reactstrap'
import * as Yup from 'yup'
import { mutations, queries } from '../../../../api'
import { SolidButton } from '../../../../shared/button'
import { SearchableSelectInput, TextInput } from '../../../../shared/form-fields'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { CustomField, CustomFieldFormProps, CustomFieldFormValues } from '../../../../types'
import { stringify } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { yupObject } from '../../../../utils/validation-schemas'
import { safeJsonParse } from '../../../web/utils/custom-functions'

const CustomFieldForm: FC<CustomFieldFormProps> = ({ onSubmit }) => {
  const { data } = queries.useGetCustomFieldList()
  const dispatch = useAppDispatch()
  const fields: CustomField[] = data?.fields || []
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({})
  const { mutate: updateCustomFields, isPending } = mutations.useUpdateCustomFields()
  const { team } = useAppSelector((store) => store.team)

  const existingCustomFields: Record<string, string> = team?.teamCustomField ? safeJsonParse(team.teamCustomField) : {}

  const isSelectField = (fieldValue?: string): boolean => {
    return !!fieldValue && fieldValue.trim().length > 0
  }

  const getExistingValue = (fieldName: string): string => {
    return existingCustomFields[fieldName] || ''
  }

  const initialValues: CustomFieldFormValues = fields.reduce((acc, field) => {
    const existingValue = getExistingValue(field.field_name)
    return { ...acc, [field.field_name]: existingValue || '' }
  }, {} as CustomFieldFormValues)

  const validationSchema = yupObject(
    fields.reduce<Record<string, Yup.StringSchema>>((acc, field) => {
      if (field?.is_mandatory) {
        acc[field.field_name] = Yup.string().required(`${field.field_name} is required`)
      }
      return acc
    }, {}),
  )

  const getFieldOptions = (field: CustomField) => {
    if (!field.value || field.value.trim().length === 0) return []

    const baseOptions = field.value.includes(',')
      ? field.value.split(',').map((val) => ({ label: val.trim(), value: val.trim() }))
      : [{ label: field.value.trim(), value: field.value.trim() }]

    const customFieldOptions = customOptions[field.field_name] || []
    const customOptionsFormatted = customFieldOptions.map((val) => ({
      label: val,
      value: val,
    }))

    return [...baseOptions, ...customOptionsFormatted]
  }

  const handleAddCustomValue = (fieldName: string, value: string) => {
    if (value.trim()) {
      setCustomOptions((prev) => ({
        ...prev,
        [fieldName]: [...(prev[fieldName] || []), value.trim()],
      }))
    }
  }

  useEffect(() => {
    if (data && !data?.fields?.length) {
      dispatch(setScreen('webScreen'))
    }
  }, [data, dispatch])

  if (fields.length === 0) {
    return null 
  }

  return (
    <Formik<CustomFieldFormValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      validateOnBlur={false}
      onSubmit={(values, { setSubmitting }) => {
        try {
          const payload = { value: stringify(values) }
          updateCustomFields(payload, {
            onSuccess: () => {
              onSubmit(values)
              setSubmitting(false)
            },
            onError: (error: any) => {
              toaster('error', error?.message || 'Failed to save custom fields')
              setSubmitting(false)
            },
          })
        } catch (error: any) {
          toaster('error', error?.message || 'Failed to save custom fields')
          setSubmitting(false)
        }
      }}
    >
      {({ setFieldValue, values, errors, touched, isValid, isSubmitting }) => {
        const handleFieldChange = (fieldName: string, value: string | null) => {
          setFieldValue(fieldName, value ?? '')
        }

        const getSelectValue = (field: CustomField) => {
          const fieldValue = values[field.field_name]
          return fieldValue ? { label: fieldValue, value: fieldValue } : null
        }

        return (
          <Form className="custom-field-form">
            <div className="form-inputs">
              {fields.map((field) => {
                const shouldShowSelect = isSelectField(field.value)

                return (
                  <Row key={field.id || field.field_name} className="margin-b-19">
                    <Col>
                      {shouldShowSelect ? (
                        <SearchableSelectInput
                          label={field.field_name}
                          name={field.field_name}
                          options={getFieldOptions(field)}
                          value={getSelectValue(field)}
                          isMulti={false}
                          placeholder={`Select ${field.field_name}`}
                          onOptionChange={(option) =>
                            handleFieldChange(field.field_name, option ? (option as any).value : null)
                          }
                          isClearable={!field.is_mandatory}
                          helperText={field.description}
                          layout="vertical"
                          error={
                            (touched as FormikTouched<CustomFieldFormValues>)[field.field_name] &&
                            (errors as FormikErrors<CustomFieldFormValues>)[field.field_name]
                              ? (errors as FormikErrors<CustomFieldFormValues>)[field.field_name]
                              : undefined
                          }
                          touched={(touched as FormikTouched<CustomFieldFormValues>)[field.field_name]}
                          showAddButton={field?.is_user_add_value}
                          onAddClick={(option) => handleAddCustomValue(field.field_name, String(option?.value || ''))}
                          noOptionsMessage={() =>
                            field?.is_user_add_value ? 'Type to add new option' : 'No options available'
                          }
                        />
                      ) : (
                        <TextInput
                          label={field.field_name}
                          name={field.field_name}
                          type="text"
                          placeholder={`Enter ${field.field_name}`}
                          helperText={field.description}
                          layout="vertical"
                          value={values[field.field_name] || ''}
                          error={
                            (touched as FormikTouched<CustomFieldFormValues>)[field.field_name] &&
                            (errors as FormikErrors<CustomFieldFormValues>)[field.field_name]
                              ? (errors as FormikErrors<CustomFieldFormValues>)[field.field_name]
                              : undefined
                          }
                          touched={(touched as FormikTouched<CustomFieldFormValues>)[field.field_name]}
                        />
                      )}
                    </Col>
                  </Row>
                )
              })}
            </div>
            <SolidButton
              type="submit"
              color="primary"
              className="w-100 submit-btn"
              title="Save Custom Fields"
              disabled={isPending || isSubmitting || !isValid}
            />
          </Form>
        )
      }}
    </Formik>
  )
}

export default CustomFieldForm
