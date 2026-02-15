import { Field, Form, Formik } from 'formik'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { RiCloseLargeLine } from 'react-icons/ri'
import { Col, FormGroup, Input, Label, Row } from 'reactstrap'
import { SolidButton } from '../../../../../shared/button/SolidButton'
import { PhoneInput } from '../../../../../shared/form-fields'
import { SvgIcon } from '../../../../../shared/icons'
import { Image } from '../../../../../shared/image'
import { PersonalDetailsProps } from '../../../../../types'
import { nameSchema, phoneSchema, yupObject } from '../../../../../utils/validation-schemas'
import { useCountry } from '../../../../../utils/hooks/useCountry'

const PersonalDetails: FC<PersonalDetailsProps> = ({
  user,
  hasAvatar,
  avatarPreview,
  onAvatarChange,
  onRemoveAvatar,
  onSubmit,
  isPending,
}) => {
  const { t } = useTranslation()
  const { getCountryNameByCode } = useCountry()
  const countryName = getCountryNameByCode(user.country_code || '') 

  return (
    <div className="profile-section">
      <Formik
        initialValues={{
          first_name: user?.name?.split(' ')[0] || '',
          last_name: user?.name?.split(' ')[1] || '',
          phone: user?.phone || '',
          country_code: user?.country_code || '',
          email: user?.email || '',
          country: countryName,
        }}
        validationSchema={yupObject({
          first_name: nameSchema(t('first_name')),
          last_name: nameSchema(t('last_name')),
          phone: phoneSchema,
        })}
        enableReinitialize
        onSubmit={onSubmit}
        validateOnBlur={false}
      >
        {({ values, errors, touched, submitForm }) => (
          <Form>
            <div className="profile-avatar-section d-flex align-items-start mt-3">
              <div className="avatar-upload-container me-sm-3 me-0 mb-sm-0 mb-3">
                <div className="profile-avatar">
                  {hasAvatar ? (
                    <Image src={avatarPreview!} alt="Profile" className="rounded-circle" />
                  ) : (
                    <div className="profile-placeholder rounded-circle flex-center">
                      {(values.first_name || values.last_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className='position-relative'>
                  <Input type="file" id="avatar-upload" accept="image/*" className="d-none" onChange={onAvatarChange} />
                  <label htmlFor="avatar-upload" className="avatar-upload-btn">
                    <SvgIcon iconId="camera" className="common-svg-hw" />
                  </label>
                  {hasAvatar && (
                    <button type="button" className="avatar-remove-btn" onClick={onRemoveAvatar} title="Remove image">
                      <RiCloseLargeLine />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-grow-1">
                <Row className="g-3">
                  <Col md={6}>
                    <FormGroup className="no-margin">
                      <Label>First Name</Label>
                      <Field
                        name="first_name"
                        as={Input}
                        placeholder="First Name"
                        className="custom-input"
                        invalid={!!(errors.first_name && touched.first_name)}
                      />
                      {errors.first_name && touched.first_name && (
                        <div className="text-danger small">{errors.first_name as string}</div>
                      )}
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup className="no-margin">
                      <Label>Last Name</Label>
                      <Field
                        name="last_name"
                        as={Input}
                        placeholder="Last Name"
                        className="custom-input"
                        invalid={!!(errors.last_name && touched.last_name)}
                      />
                      {errors.last_name && touched.last_name && (
                        <div className="text-danger small">{errors.last_name as string}</div>
                      )}
                    </FormGroup>
                  </Col>
                  <Col md={6} className="profile-phone">
                    <PhoneInput xxlClass2={4} codeName="country_code" name="phone" label={t('phone')} />
                  </Col>
                  <Col md={6}>
                    <div className="account-section no-margin">
                      <Label>Email</Label>
                      <div className="account-info">
                        <SvgIcon iconId="mail-icon" className="mail-info" />
                        <div className="account-details">
                          <p className="mb-0">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
            <div className="preferences-btn-box">
              <SolidButton
                loading={isPending}
                title={t('save')}
                type="button"
                color="primary"
                onClick={() => submitForm()}
              />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default PersonalDetails
