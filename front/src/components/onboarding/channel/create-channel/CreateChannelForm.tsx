import { Form, Formik } from 'formik'
import { useTranslation } from 'react-i18next'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button'
import { SearchableSelectInput, TextInput } from '../../../../shared/form-fields'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { CreateChannelFormValues } from '../../../../types'
import { dynamicNameSchema, yupObject } from '../../../../utils/validation-schemas'

const CreateChannelForm = () => {
  const { mutate, isPending } = mutations.useChannelCreate()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const handleSubmit = async (values: CreateChannelFormValues) => {
    mutate(
      { name: values?.name, description: values?.description, type: values?.type },
      {
        onSuccess: () => {
          dispatch(setScreen('webScreen'))
        },
      },
    )
  }

  return (
    <Formik
      initialValues={{ name: '', description: '', type: 'public' }}
      validationSchema={yupObject({
        name: dynamicNameSchema('Channel name'),
        description: dynamicNameSchema('Description'),
      })}
      onSubmit={handleSubmit}
      validateOnBlur={false}
    >
      {({ setFieldValue, values, touched, errors }) => (
        <Form className="login-form">
          <div className="login-input margin-b-15">
            <TextInput
              layout="vertical"
              label="channel_name"
              name="name"
              type="text"
              placeholder="Dev squad, kudos corner, design hub, etc..."
              className="custom-input"
            />
          </div>

          <div className="login-input margin-b-15">
            <TextInput
              layout="vertical"
              label="description"
              name="description"
              type="text"
              placeholder="enter_a_short_description_for_your_channel"
              className="custom-input"
            />
          </div>

          <div className="login-input margin-b-30">
            <SearchableSelectInput
              layout="vertical"
              label="channel_type"
              name="type"
              options={[
                { label: 'Public', value: 'public' },
                { label: 'Private', value: 'private' },
              ]}
              value={{
                label: values.type === 'public' ? 'Public' : 'Private',
                value: values.type,
              }}
              onOptionChange={(option: any) => {
                setFieldValue('type', option.value)
              }}
              isClearable={false}
              touched={touched.type}
              error={errors.type as string}
            />
          </div>

          <SolidButton title="submit" loading={isPending} type="submit" color="primary" className="w-100 login-btn" />
          <div onClick={() => dispatch(setScreen('webScreen'))} className="link-text">
            {t('skip')}
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default CreateChannelForm
