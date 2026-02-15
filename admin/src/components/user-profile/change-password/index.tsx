import { Form, Formik, FormikHelpers } from 'formik'
import { Accordion, AccordionBody, AccordionItem, Col, Row } from 'reactstrap'
import { mutations } from '../../../api'
import { SolidButton } from '../../../shared/button/SolidButton'
import CardWrapper from '../../../shared/card/CardWrapper'
import { TextInput } from '../../../shared/form-fields'
import SvgIcon from '../../../shared/icons/SvgIcon'
import { useAppSelector } from '../../../store/hooks'
import { UpdatePasswordFormValues } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import { useToggle } from '../../../utils/hooks'
import { updatePasswordSchema } from '../../../utils/validation-schemas'

const ChangePassword = () => {
  const { user } = useAppSelector((store) => store.auth)
  const { open, toggle } = useToggle('1')
  const { mutate, isPending } = mutations.useUpdatePassword()
  
  const handleSubmit = (values: UpdatePasswordFormValues, { resetForm }: FormikHelpers<UpdatePasswordFormValues>) => {
    mutate(
      {
        password: values?.new_password,
        old_password: values?.old_password,
      },
      {
        onSuccess: () => {
          resetForm()
          toaster('success', 'Password updated successfully.')
        },
      },
    )
  }

  return (
    <Col xl="12">
      <CardWrapper
        headerProps={{ onClick: () => toggle('1') }}
        heading={{
          title: 'change_password',
          subtitle: `One Password for all the teams connected with ${user?.email}`,
          headerChildren: <SvgIcon iconId="drop-down" className="common-svg-hw" />,
        }}
      >
        <Accordion open={open} toggle={toggle}>
          <AccordionItem className="no-border">
            <AccordionBody accordionId="1">
              <Formik
                initialValues={{
                  new_password: '',
                  confirm_password: '',
                  old_password: '',
                }}
                validationSchema={updatePasswordSchema}
                onSubmit={handleSubmit}
              >
                {({ resetForm }) => (
                  <Form className="login-form">
                    <div className="Container-fluid">
                      <Row>
                        <Col md="4">
                          <TextInput
                            label="old_password"
                            iconProps={{ iconId: 'lock', className: 'form-icon' }}
                            name="old_password"
                            placeholder="*********"
                            type="password"
                          />
                        </Col>
                        <Col md="4">
                          <TextInput
                            label="new_password"
                            iconProps={{ iconId: 'lock', className: 'form-icon' }}
                            name="new_password"
                            placeholder="*********"
                            type="password"
                          />
                        </Col>
                        <Col md="4">
                          <TextInput
                            label="confirm_password"
                            iconProps={{ iconId: 'lock', className: 'form-icon' }}
                            name="confirm_password"
                            type="password"
                            placeholder="*********"
                          />
                        </Col>
                      </Row>
                    </div>
                    <div className="d-flex form-actions">
                      <SolidButton loading={isPending} title="save" type="submit" color="primary" />
                      <SolidButton title="cancel" className="Login-btn btn-outline-light" onClick={() => resetForm()} />
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
