import { Form, Formik } from 'formik'
import { FC } from 'react'
import { Col, Row } from 'reactstrap'
import { mutations, queries } from '../../../api'
import { SolidButton } from '../../../shared/button/SolidButton'
import { PhoneInput, TextInput } from '../../../shared/form-fields'
import { EditProfileFormValues, EditProfileProps } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import { nameSchema, phoneSchema, yupObject } from '../../../utils/validation-schemas'

const EditProfileForm: FC<EditProfileProps> = ({ profileImageFile }) => {
  const { mutate: updateProfile, isPending } = mutations.useUpdateProfile()
  const { data } = queries.useGetUserDetails()

  const handleSubmit = async (values: EditProfileFormValues) => {
    const formData = new FormData()
    formData.append('name', `${values.first_name} ${values.last_name}`)
    formData.append('country_code', values.country_code)
    formData.append('phone', values.phone)

    if (profileImageFile instanceof File) {
      formData.append('avatars', profileImageFile)
    }

    updateProfile(formData, {
      onSuccess: () => {
        toaster('success', 'Profile updated successfully')
      },
    })
  }

  return (
    <Formik
      initialValues={{
        first_name: data?.user?.name?.split(' ')[0] || '',
        last_name: data?.user?.name?.split(' ')[1] || '',
        country_code: data?.user?.country_code || '',
        phone: data?.user?.phone || '',
        email: data?.user?.email || '',
      }}
      validationSchema={yupObject({
        first_name: nameSchema('First Name'),
        last_name: nameSchema('Last Name'),
        phone: phoneSchema,
      })}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {() => (
        <Form className="login-form">
          <Row>
            <Col xs="12" md="6">
              <TextInput className="custom-input" label="first_name" name="first_name" placeholder="enter_firstname" />
            </Col>
            <Col xs="12" md="6">
              <TextInput className="custom-input" label="last_name" name="last_name" placeholder="enter_lastname" />
            </Col>
          </Row>
          <PhoneInput codeName="country_code" name="phone" label="phone" />
          <div className="form-actions">
            <SolidButton loading={isPending} title="save" type="submit" color="primary" />
            <SolidButton title="cancel" color="outline-light" />
          </div>
        </Form>
      )}
    </Formik>
  )
}
export default EditProfileForm
