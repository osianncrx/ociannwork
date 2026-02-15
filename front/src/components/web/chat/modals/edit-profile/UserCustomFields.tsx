import { Form, Formik } from 'formik'
import * as Yup from 'yup'
import { mutations, queries } from '../../../../../api'
import { SolidButton } from '../../../../../shared/button/SolidButton'
import { SearchableSelectInput, TextInput } from '../../../../../shared/form-fields'
import { OptionType, UserCustomFieldsProps } from '../../../../../types'
import { toaster } from '../../../../../utils/custom-functions'
import { stringify } from '../../../../../utils'

const UserCustomFields = ({ customFieldValues, toggle }: UserCustomFieldsProps) => {
  const { mutate: updateCustomFields, isPending: isCustomFieldsPending } = mutations.useUpdateCustomFields()
  const { data } = queries.useGetCustomFieldList()
  const { refetch } = queries.useGetUserDetails()

  // Create validation schema based on mandatory fields
  const createValidationSchema = () => {
    const schema: Record<string, any> = {}

    if (data?.fields) {
      data.fields.forEach((field: any) => {
        if (field.is_mandatory) {
          schema[field.field_name] = Yup.string()
            .required(`${field.field_name} is required`)
            .test('not-empty', `${field.field_name} is required`, (value) => {
              return value !== undefined && value !== null && value.trim() !== ''
            })
        }
      })
    }

    return Yup.object().shape(schema)
  }

  // Helper function to convert field values to options
  const getFieldOptions = (field: any): OptionType[] => {
    if (!field?.value) return []

    return field.value.split(',').map((option: string) => ({
      label: option.trim(),
      value: option.trim(),
    }))
  }

  // Helper function to get current value for a field
  const getCurrentValue = (field: any, currentFormValue: any) => {
    if (!currentFormValue || !field?.value) return null

    const options = getFieldOptions(field)
    return options.find((option) => option.value === currentFormValue) || null
  }

  return (
    <Formik
      enableReinitialize
      initialValues={customFieldValues}
      validationSchema={createValidationSchema()}
      validateOnBlur={false}
      onSubmit={(values, { setSubmitting }) => {
        updateCustomFields(
          { value: stringify(values) },
          {
            onSuccess: () => {
              toaster('success', 'Profile updated successfully')
              setSubmitting(false)
              refetch()
              toggle()
            },
            onError: (err: any) => {
              toaster('error', err?.message || 'Failed to update custom fields')
              setSubmitting(false)
            },
          },
        )
      }}
    >
      {({ isSubmitting, setFieldValue, values, errors, touched }) => (
        <Form className="mt-3">
          {data?.fields?.map((field) => {
            const fieldKey = field.field_name
            const hasPredefinedValues = field?.value && field.value.trim() !== ''
            const currentFormValue = values[fieldKey]
            const isMandatory = field?.is_mandatory || false
            const fieldError = errors[fieldKey] as string | undefined
            const fieldTouched = touched[fieldKey] as boolean | undefined

            return (
              <div className="mb-3" key={field.id}>
                {hasPredefinedValues ? (
                  <SearchableSelectInput
                    layout="vertical"
                    label={`${fieldKey}${isMandatory ? ' *' : ''}`}
                    name={fieldKey}
                    options={getFieldOptions(field)}
                    value={getCurrentValue(field, currentFormValue)}
                    onOptionChange={(selectedOption) => {
                      const value = Array.isArray(selectedOption) ? selectedOption[0]?.value : selectedOption?.value
                      setFieldValue(fieldKey, value || '')
                    }}
                    placeholder={`Select ${fieldKey}${isMandatory ? ' (required)' : ''}`}
                    isClearable={true}
                    error={fieldError}
                    touched={fieldTouched}
                  />
                ) : (
                  <TextInput
                    layout="vertical"
                    label={`${fieldKey}${isMandatory ? ' *' : ''}`}
                    name={fieldKey}
                    type="text"
                    placeholder={`Enter ${fieldKey}${isMandatory ? ' (required)' : ''}`}
                    error={fieldError}
                    touched={fieldTouched}
                  />
                )}
              </div>
            )
          })}
          <div className="preferences-btn-box">
            <SolidButton
              type="submit"
              color="primary"
              // className="mt-2"
              title="Save"
              loading={isSubmitting || isCustomFieldsPending}
            />
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default UserCustomFields
