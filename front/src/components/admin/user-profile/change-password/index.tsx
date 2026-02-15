import { Form, Formik, FormikHelpers } from 'formik'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionBody, AccordionItem, Col, Container, Row } from 'reactstrap'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button/SolidButton'
import CardWrapper from '../../../../shared/card/CardWrapper'
import { TextInput } from '../../../../shared/form-fields'
import SvgIcon from '../../../../shared/icons/SvgIcon'
import { useAppSelector } from '../../../../store/hooks'
import { UpdatePasswordFormValues } from '../../../../types'
import { toaster } from '../../../../utils/custom-functions'
import { useToggle } from '../../../../utils/hooks'
import { updatePasswordSchema } from '../../../../utils/validation-schemas'

const ChangePassword = () => {
  const { user } = useAppSelector((store) => store.auth)
  const { open, toggle } = useToggle('1')
  const { mutate, isPending } = mutations.useUpdatePassword()
  const [showPassword, setShowPassword] = useState({
    old_password: false,
    new_password: false,
    confirm_password: false,
  })
  const { t } = useTranslation()

  const handleShowPassword = (field: keyof typeof showPassword) => {
    setShowPassword({ ...showPassword, [field]: !showPassword[field] })
  }

  const handleSubmit = (values: UpdatePasswordFormValues, { resetForm }: FormikHelpers<UpdatePasswordFormValues>) => {
    mutate(
      {
        password: values?.new_password,
        old_password: values?.old_password,
      },
      {
        onSuccess: (response) => {
          resetForm()
          const message = response?.message || t('password_updated_successfully')
          toaster('success', message)
        },
      },
    )
  }

  return (
    <Col xl="12">
      <CardWrapper
        headerProps={{ onClick: () => toggle('1') }}
        className="custom-according"
        heading={{
          title: t('change_password'),
          subtitle: t('one_password_for_all_teams', { email: user?.email }),
        }}
      >
        <Accordion open={open} toggle={toggle}>
          <AccordionItem className="no-border custom-item-according">
            <AccordionBody accordionId="1">
              <Formik
                initialValues={{
                  new_password: '',
                  confirm_password: '',
                  old_password: '',
                }}
                validationSchema={updatePasswordSchema}
                onSubmit={handleSubmit}
                validateOnBlur={true}
              >
                {() => (
                  <Form className="login-form">
                    <Container fluid className="mb-3">
                      <Row>
                        <Col lg="4">
                          <TextInput
                            layout="vertical"
                            formGroupClass="margin-b-30"
                            label={t('old_password')}
                            iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
                            name="old_password"
                            type={showPassword.old_password ? 'text' : 'password'}
                            placeholder={t('enter_old_password')}
                          >
                            <div
                              className="password-wrap password-box"
                              onClick={() => handleShowPassword('old_password')}
                            >
                              {showPassword.old_password ? (
                                <SvgIcon className="icon-eye" iconId="show-eye" />
                              ) : (
                                <SvgIcon className="icon-eye" iconId="hide-eye" />
                              )}
                            </div>
                          </TextInput>
                        </Col>
                        <Col lg="4">
                          <TextInput
                            layout="vertical"
                            formGroupClass="margin-b-30"
                            label={t('new_password')}
                            iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
                            name="new_password"
                            type={showPassword.new_password ? 'text' : 'password'}
                            placeholder={t('enter_new_password')}
                          >
                            <div
                              className="password-wrap password-box"
                              onClick={() => handleShowPassword('new_password')}
                            >
                              {showPassword.new_password ? (
                                <SvgIcon className="icon-eye" iconId="show-eye" />
                              ) : (
                                <SvgIcon className="icon-eye" iconId="hide-eye" />
                              )}
                            </div>
                          </TextInput>
                        </Col>
                        <Col lg="4">
                          <TextInput
                            layout="vertical"
                            formGroupClass="margin-b-30"
                            label={t('confirm_password')}
                            iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
                            name="confirm_password"
                            type={showPassword.confirm_password ? 'text' : 'password'}
                            placeholder={t('retype_new_password')}
                          >
                            <div
                              className="password-wrap password-box"
                              onClick={() => handleShowPassword('confirm_password')}
                            >
                              {showPassword.confirm_password ? (
                                <SvgIcon className="icon-eye" iconId="show-eye" />
                              ) : (
                                <SvgIcon className="icon-eye" iconId="hide-eye" />
                              )}
                            </div>
                          </TextInput>
                        </Col>
                      </Row>
                    </Container>

                    <div className="d-flex form-actions">
                      <SolidButton
                        loading={isPending}
                        title={t('save')}
                        type="submit"
                        color="primary"
                        className="btn btn-primary"
                      />
                    </div>
                  </Form>
                )}
              </Formik>
            </AccordionBody>
          </AccordionItem>
        </Accordion>
      </CardWrapper>
    </Col>
  )
}

export default ChangePassword
