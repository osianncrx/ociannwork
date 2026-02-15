import { Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Col, Container, Label, Row } from 'reactstrap'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import { SwitchInput, TextInput } from '../../shared/form-fields'
import CkEditor from '../../shared/form-fields/CkEditor'
import SearchableSelect from '../../shared/form-fields/SearchableSelectInput'
import { SinglePage } from '../../types'
import { ROUTES } from '../../constants'
import { typeOptions, usePageFormHelpers, validationSchema } from './pageFormHelpers'
import { FormValues, SelectOption } from '../../types/components/pages'

const PageForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const pageData = location.state?.pageData as SinglePage | undefined
  const { handleSubmit } = usePageFormHelpers()

  const [initialValues, setInitialValues] = useState<FormValues>({
    title: '',
    slug: '',
    content: '',
    status: 'active',
    created_by: 1,
  })

  const [selectedType, setSelectedType] = useState<SelectOption | null>(typeOptions[2])

  useEffect(() => {
    if (isEdit && pageData) {
      setInitialValues({
        title: pageData.title,
        slug: pageData.slug,
        content: pageData.content,
        status: pageData.status,
        created_by: pageData.created_by,
      })
      const matched = typeOptions.find((opt) => opt.value === pageData.slug)
      setSelectedType(matched ?? typeOptions[2])
    }
  }, [isEdit, pageData])

  const handleCancel = () => {
    navigate(ROUTES.MANAGE_PAGES)
  }

  if (isEdit && !pageData) {
    return (
      <Container fluid>
        <Row>
          <Col xl="12">
            <CardWrapper
              heading={{
                title: 'edit_page',
                subtitle: 'error_loading_page',
              }}
            >
              <div className="text-center py-4">
                <div className="alert alert-warning">
                  <h5>Page Data Not Available</h5>
                  <p>Unable to load page details. Please go back and try editing again.</p>
                  <SolidButton className="btn-bg-secondary" onClick={() => navigate(ROUTES.MANAGE_PAGES)}>
                    Back to Page List
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
              title: isEdit ? 'edit_page' : 'add_new_page',
              subtitle: isEdit ? 'update_page_information' : 'create_a_new_page',
            }}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, helpers) => handleSubmit(values, isEdit, id, navigate, helpers)}
              enableReinitialize
            >
              {({ values, errors, touched, isSubmitting, setFieldValue }) => (
                <Form>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <TextInput
                        name="title"
                        label="Title"
                        placeholder="Enter page title"
                        value={values.title}
                        onChange={(e) => setFieldValue('title', e.target.value)}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <Label>Slug Options</Label>
                      <SearchableSelect
                        options={typeOptions}
                        value={selectedType}
                        onChange={(option: SelectOption | null) => {
                          setSelectedType(option)
                          if (!option) {
                            return
                          }
                          if (option.value === 'other') {
                            setFieldValue('slug', '')
                          } else {
                            setFieldValue('slug', option.value)
                          }
                        }}
                        placeholder="Select Page Type"
                        isClearable
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <TextInput
                        name="slug"
                        label="Slug"
                        placeholder="Enter page slug"
                        value={values.slug}
                        onChange={(e) =>
                          setFieldValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                        }
                        readOnly={!!selectedType && selectedType.value !== 'other'}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <SwitchInput
                        name="status"
                        label="Status"
                        layout="horizontal"
                        helperText={values.status === 'active' ? 'Active' : 'Inactive'}
                        onToggle={(checked) => {
                          setFieldValue('status', checked ? 'active' : 'deactive')
                        }}
                      />
                    </div>
                    
                    <div className="col-md-12 mb-3">
                      <CkEditor
                        name="content"
                        label="Content"
                        placeholder="Enter page content"
                        value={values.content}
                        onChange={(data) => setFieldValue('content', data)}
                        editorLoaded={true}
                        error={errors.content}
                        touched={touched.content}
                      />
                    </div>



                    <div className="col-12 d-flex justify-content-end">
                      <div className="d-flex gap-2">
                        <SolidButton
                          type="button"
                          className="btn-bg-light"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </SolidButton>
                        <SolidButton type="submit" className="btn-bg-primary" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : isEdit ? 'Update Page' : 'Create Page'}
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

export default PageForm
