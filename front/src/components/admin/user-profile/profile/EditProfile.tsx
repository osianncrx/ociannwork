import { Form, Formik } from 'formik'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import { mutations, queries } from '../../../../api'
import { SolidButton } from '../../../../shared/button/SolidButton'
import { PhoneInput, TextInput } from '../../../../shared/form-fields'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setUserData } from '../../../../store/slices/authSlice'
import { EditProfileFormValues, EditProfileProps } from '../../../../types'
import { toaster } from '../../../../utils/custom-functions'
import { useCountry } from '../../../../utils/hooks/useCountry'
import { nameSchema, phoneSchema, yupObject } from '../../../../utils/validation-schemas'

const EditProfileForm: FC<EditProfileProps> = ({
  profileImageFile,
  removeAvatar = false,
  setProfileImageFile,
  setRemoveAvatar,
  setPreviewImage,
}) => {
  const { mutate: updateProfile, isPending } = mutations.useUpdateProfile()
  const { refetch } = queries.useGetUserDetails()
  const { user } = useAppSelector((store) => store.auth)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { getCountryNameByCode } = useCountry()

  const handleSubmit = async (values: EditProfileFormValues) => {
    const formData = new FormData()
    const countryName = getCountryNameByCode(values.country_code)
    formData.append('name', `${values.first_name} ${values.last_name}`)
    formData.append('country_code', values.country_code)
    formData.append('phone', values.phone)

    if (removeAvatar) {
      formData.append('remove_avatar', 'true')
    } else if (profileImageFile instanceof File) {
      formData.append('avatar', profileImageFile)
    }

    updateProfile(formData, {
      onSuccess: (response) => {
        const message = response?.message || t('profile_updated_successfully')
        toaster('success', message)
        dispatch(
          setUserData({
            ...user,
            avatar: response.user?.avatar || null,
            name: response.user?.name,
            country_code: values.country_code,
            phone: values.phone,
            country: countryName,
          }),
        )
        setProfileImageFile?.(null)
        setRemoveAvatar?.(false)
        setPreviewImage?.(null)
        refetch()
      },
      onError: () => {
        setProfileImageFile?.(null)
        setRemoveAvatar?.(false)
        setPreviewImage?.(null)
      },
    })
  }

  return (
    <Formik
      initialValues={{
        first_name: user?.name?.split(' ')[0] || '',
        last_name: user?.name?.split(' ')[1] || '',
        country_code: user?.country_code || '',
        phone: user?.phone || '',
        email: user?.email || '',
      }}
      validationSchema={yupObject({
        first_name: nameSchema(t('first_name')),
        last_name: nameSchema(t('last_name')),
        phone: phoneSchema,
      })}
      enableReinitialize
      onSubmit={handleSubmit}
      validateOnBlur={false}
    >
      {() => (
        <Form className="login-form">
          <Row className="margin-b-12">
            <Col xs="12" md="6">
              <TextInput
                layout="vertical"
                className="custom-input"
                label={t('first_name')}
                name="first_name"
                placeholder={t('enter_firstname')}
                onlyAlphabets
              />
            </Col>
            <Col xs="12" md="6">
              <TextInput
                layout="vertical"
                className="custom-input"
                label={t('last_name')}
                name="last_name"
                placeholder={t('enter_lastname')}
                onlyAlphabets
              />
            </Col>
          </Row>
          <PhoneInput codeName="country_code" name="phone" label={t('phone')} />
          <div className="form-actions">
            <SolidButton loading={isPending} title={t('save')} type="submit" color="primary" />
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default EditProfileForm
