import { Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Col, Container, Row } from 'reactstrap'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import { SwitchInput, TextArea, TextInput } from '../../shared/form-fields'
import { SingleFAQ } from '../../types'
import { ROUTES } from '../../constants'
import { useFaqFormHelpers, validationSchema } from './faqFormHelpers'
import { FormValues } from '../../types/components/faqs'

const FaqForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const faqData = location.state?.faqData as SingleFAQ | undefined
  const { handleSubmit } = useFaqFormHelpers()

  const [initialValues, setInitialValues] = useState<FormValues>({
    question: '',
    answer: '',
    statusSwitch: true,
  })

  useEffect(() => {
    if (isEdit && faqData) {
      setInitialValues({
        question: faqData.question,
        answer: faqData.answer,
        statusSwitch: faqData.status === 'active',
      })
    }
  }, [isEdit, faqData])

  const handleCancel = () => {
    navigate(ROUTES.MANAGE_FAQS)
  }

  if (isEdit && !faqData) {
    return (
      <Container fluid>
        <Row>
          <Col xl="12">
            <CardWrapper
              heading={{
                title: 'edit_faq',
                subtitle: 'error_loading_faq',
              }}
            >
              <div className="text-center py-4">
                <div className="alert alert-warning">
                  <h5>FAQ Data Not Available</h5>
                  <p>Unable to load FAQ details. Please go back and try editing again.</p>
                  <SolidButton className="btn-bg-secondary" onClick={() => navigate(ROUTES.MANAGE_FAQS)}>
                    Back to FAQ List
                  </SolidButton>
                </div>
              </div>
            </CardWrapper>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container fluid>
      <Row>
        <Col xl="8" className='mx-auto'>
          <CardWrapper
            heading={{
              title: isEdit ? 'edit_faq' : 'add_new_faq',
              subtitle: isEdit ? 'update_faq_information' : 'create_a_new_frequently_asked_question',
            }}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, { setSubmitting }) => handleSubmit(values, isEdit, id, navigate, setSubmitting)}
              enableReinitialize
            >
              {({ values, isSubmitting, setFieldValue }) => (
                <Form>
                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <TextInput
                        name="question"
                        label="Question"
                        placeholder="Enter FAQ question"
                        value={values.question}
                        onChange={(e) => setFieldValue('question', e.target.value)}
                      />
                    </div>

                    <div className="col-md-12 mb-3">
                      <TextArea
                        name="answer"
                        label="Answer"
                        placeholder="Enter detailed answer"
                        rows={6}
                        value={values.answer}
                        onChange={(e) => setFieldValue('answer', e.target.value)}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <SwitchInput
                        name="statusSwitch"
                        label="Status"
                        layout="horizontal"
                        helperText={values.statusSwitch ? 'Active' : 'Inactive'}
                        onToggle={(checked) => {
                          setFieldValue('statusSwitch', checked)
                          setFieldValue('status', checked ? 'active' : 'inactive')
                        }}
                      />
                    </div>

                    <div className="col-12">
                      <div className="d-flex gap-2 justify-content-end">
                        <SolidButton
                          type="button"
                          color="light"
                          className="btn-bg-light"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </SolidButton>
                        <SolidButton type="submit" className="btn-bg-primary" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : isEdit ? 'Update FAQ' : 'Create FAQ'}
                        </SolidButton>
                      </div>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default FaqForm
