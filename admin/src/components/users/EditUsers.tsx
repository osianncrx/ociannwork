import { Formik, Form as FormikForm } from 'formik'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Col, Container, Row } from 'reactstrap'
import { mutations } from '../../api'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import { PhoneInput, TextInput } from '../../shared/form-fields'
import { ConfirmModal } from '../../shared/modal'
import { nameSchema, phoneSchema, yupObject } from '../../utils/validation-schemas'
import { ROUTES } from '../../constants'
import { useEditUser } from '../../utils/hooks/useEditUser'
import { useEditUserService } from './editUserService'
import EditUserProfile from './EditUserProfile'

const EditUsers = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: updateProfile, isPending } = mutations.useUpdateProfile()
  const { handleSubmit } = useEditUserService()

  const {
    userData,
    initialValues,
    avatarPreview,
    removeAvatar,
    confirmRemoveMemberOpen,
    avatar,
    hasAvatar,
    setConfirmRemoveMemberOpen,
    confirmRemoveAvatar,
    onAvatarChange,
    onRemoveAvatar,
  } = useEditUser()

  return (
    <>
      <Container fluid>
        <Row>
          <Col xl="12">
            <CardWrapper
              heading={{
                title: t('edit_user'),
                subtitle: t('edit_details_of_user'),
              }}
            >
              <Formik
                initialValues={initialValues}
                validationSchema={yupObject({
                  first_name: nameSchema(t('first_name')),
                  last_name: nameSchema(t('last_name')),
                  phone: phoneSchema,
                })}
                onSubmit={(values, helpers) =>
                  handleSubmit(values, userData, avatar, removeAvatar, navigate, updateProfile, helpers)
                }
                enableReinitialize
              >
                {() => {
                  return (
                    <FormikForm className="login-form custom-field">
                      <Row>
                        <Col lg="4">
                          <EditUserProfile
                            userData={userData}
                            avatarPreview={avatarPreview}
                            removeAvatar={removeAvatar}
                            hasAvatar={hasAvatar}
                            onAvatarChange={onAvatarChange}
                            onRemoveAvatar={onRemoveAvatar}
                          />
                        </Col>
                        <Col lg="8">
                          <TextInput
                            layout="vertical"
                            className="custom-input"
                            formgroupclass="margin-b-25"
                            label={t('first_name')}
                            name="first_name"
                            labelclass="margin-b-10"
                            placeholder={t('enter_firstname')}
                            required
                          />
                          <TextInput
                            layout="vertical"
                            className="custom-input"
                            formgroupclass="margin-b-25"
                            label={t('last_name')}
                            name="last_name"
                            labelclass="margin-b-10"
                            placeholder={t('enter_lastname')}
                            required
                          />
                          <Row>
                            <Col lg="6">
                              <PhoneInput
                                xxlClass={3}
                                xxlClass2={8}
                                user={userData}
                                codeName="country_code"
                                name="phone"
                                label={t('phone')}
                              />
                            </Col>
                          </Row>
                        </Col>
                      </Row>

                      <div className="form-actions mt-3">
                        <SolidButton
                          loading={isPending}
                          title={'Update'}
                          type="submit"
                          color="primary"
                          className="btn btn-primary"
                        />
                        <SolidButton
                          title="cancel"
                          color="outline-light"
                          type="button"
                          onClick={() => navigate(ROUTES.MANAGE_TEAM)}
                        />
                      </div>
                    </FormikForm>
                  )
                }}
              </Formik>
            </CardWrapper>
          </Col>
        </Row>
      </Container>
      <ConfirmModal
        isOpen={confirmRemoveMemberOpen}
        onClose={() => {
          setConfirmRemoveMemberOpen(false)
        }}
        onConfirm={confirmRemoveAvatar}
        title="Remove Profile Picture"
        subtitle={`Are you sure you want to remove profile picture.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        showIcon={true}
        iconId="table-delete"
      />
    </>
  )
}

export default EditUsers
