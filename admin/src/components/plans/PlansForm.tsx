import { Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Col, Container, Row } from 'reactstrap'
import Select from 'react-select'
import { useField } from 'formik'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import { SwitchInput, TextArea, TextInput } from '../../shared/form-fields'
import { SinglePlan } from '../../types'
import { FEATURES, ROUTES } from '../../constants'
import { usePlanFormHelpers, validationSchema } from './planFormHelpers'
import { PlanFormValues } from '../../types/components/plans'
import { FormFeedback, FormGroup, Label } from 'reactstrap'
import SlugGenerator from './SlugGenerator'

const PlanForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const planData = location.state?.planData as SinglePlan | undefined
  const { handleSubmit } = usePlanFormHelpers()

  const [initialValues, setInitialValues] = useState<PlanFormValues>({
    name: '',
    slug: '',
    description: '',
    price_per_user_per_month: 0,
    price_per_user_per_year: '',
    billing_cycle: 'monthly',
    max_channels: 10,
    max_storage_mb: '',
    max_message_search_limit: 10000,
    allows_private_channels: true,
    allows_file_sharing: true,
    allows_video_calls: false,
    allows_multiple_delete: false,
    display_order: 0,
    is_default: false,
    statusSwitch: true,
  })

  useEffect(() => {
    if (isEdit && planData) {
      setInitialValues({
        name: planData.name || '',
        slug: planData.slug || '',
        description: planData.description || '',
        price_per_user_per_month:
          planData.price_per_user_per_month != null ? String(planData.price_per_user_per_month) : '0',
        price_per_user_per_year:
          planData.price_per_user_per_year != null ? String(planData.price_per_user_per_year) : '',
        billing_cycle: planData.billing_cycle || 'monthly',
        max_channels: planData.max_channels || 10,
        max_storage_mb: planData.max_storage_mb ?? null,
        max_message_search_limit: planData.max_message_search_limit || 10000,
        allows_private_channels: planData.allows_private_channels ?? true,
        allows_file_sharing: planData.allows_file_sharing ?? true,
        allows_video_calls: planData.allows_video_calls || false,
        allows_multiple_delete: planData.allows_multiple_delete || false,
        display_order: planData.display_order || 0,
        is_default: planData.is_default || false,
        statusSwitch: planData.status === 'active',
      })
    }
  }, [isEdit, planData])

  const handleCancel = () => {
    navigate(ROUTES.PLANS)
  }

  if (isEdit && !planData) {
    return (
      <Container fluid>
        <Row>
          <Col xl="12">
            <CardWrapper
              heading={{
                title: 'edit_plan',
                subtitle: 'error_loading_plan',
              }}
            >
              <div className="text-center py-4">
                <div className="alert alert-warning">
                  <h5>Plan Data Not Available</h5>
                  <p>Unable to load plan details. Please go back and try editing again.</p>
                  <SolidButton className="btn-bg-secondary" onClick={() => navigate(ROUTES.PLANS)}>
                    Back to Plan List
                  </SolidButton>
                </div>
              </div>
            </CardWrapper>
          </Col>
        </Row>
      </Container>
    )
  }

  const BillingCycleSelect = ({ name }: { name: string }) => {
    const [field, meta, helpers] = useField(name)
    const options = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'both', label: 'Both' },
    ]

    const selectedOption = options.find((opt) => opt.value === field.value)

    return (
      <FormGroup className="text-start">
        <Label for={name}>Billing Cycle</Label>
        <Select
          options={options}
          value={selectedOption}
          onChange={(option) => helpers.setValue(option?.value || 'monthly')}
          onBlur={() => helpers.setTouched(true)}
          classNamePrefix="react-select"
          placeholder="Select billing cycle"
        />
        {meta.touched && meta.error && <FormFeedback style={{ display: 'block' }}>{meta.error}</FormFeedback>}
      </FormGroup>
    )
  }

  return (
    <Container fluid>
      <Row>
        <Col xl="8" className="mx-auto">
          <CardWrapper
            heading={{
              title: isEdit ? 'edit_plan' : 'add_new_plan',
              subtitle: isEdit ? '' : 'create_a_new_plan',
            }}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={(values, { setSubmitting }) => handleSubmit(values, isEdit, id, navigate, setSubmitting)}
              enableReinitialize
            >
              {({ values, isSubmitting, setFieldValue }) => (
                <>
                  <SlugGenerator isEdit={isEdit} />
                  <Form>
                    <div className="row">
                      {/* Basic Information */}
                      <div className="col-md-6 mb-3">
                        <TextInput name="name" label="Plan Name" placeholder="Enter plan name" />
                      </div>

                      <div className="col-md-6 mb-3">
                        <TextInput name="slug" label="Slug" placeholder="plan-slug" />
                      </div>

                      <div className="col-md-12 mb-3">
                        <TextArea
                          name="description"
                          label="Description"
                          placeholder="Enter plan description"
                          rows={4}
                        />
                      </div>

                      {/* Pricing Information */}
                      <div className="col-md-6 mb-3">
                        <TextInput
                          name="price_per_user_per_month"
                          label="Monthly Price (per user)"
                          placeholder="0.00"
                          onlyNumeric
                          allowDecimal
                          disabled={!FEATURES.EXTENDED_VERSION}
                          value={!FEATURES.EXTENDED_VERSION ? '0.00' : undefined}
                        />
                        {!FEATURES.EXTENDED_VERSION && (
                          <small className="text-muted d-block mt-1">Free version: Plans must have $0 price</small>
                        )}
                      </div>

                      <div className="col-md-6 mb-3">
                        <TextInput
                          name="price_per_user_per_year"
                          label="Yearly Price (per user)"
                          placeholder="0.00"
                          onlyNumeric
                          allowDecimal
                          disabled={!FEATURES.EXTENDED_VERSION}
                          value={!FEATURES.EXTENDED_VERSION ? '' : undefined}
                        />
                        {!FEATURES.EXTENDED_VERSION && (
                          <small className="text-muted d-block mt-1">Free version: Plans must have $0 price</small>
                        )}
                      </div>

                      <div className="col-md-6 mb-3">
                        <BillingCycleSelect name="billing_cycle" />
                      </div>

                      {/* Usage Limits */}
                      <div className="col-md-6 mb-3">
                        <TextInput name="max_channels" label="Max Channels" placeholder="10" onlyNumeric />
                      </div>

                      <div className="col-md-6 mb-3">
                        <TextInput
                          name="max_storage_mb"
                          label="Max Storage per Team (MB)"
                          placeholder="Leave empty for unlimited"
                          onlyNumeric
                        />
                        <small className="text-muted d-block mt-1">Leave empty for unlimited team storage</small>
                      </div>

                      <div className="col-md-6 mb-3">
                        <TextInput
                          name="max_message_search_limit"
                          label="Message Search Limit"
                          placeholder="10000"
                          onlyNumeric
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <TextInput name="display_order" label="Display Order" placeholder="0" onlyNumeric />
                      </div>

                      {/* Feature Flags */}

                      <div className="col-md-6 mb-2 plans-switch">
                        <SwitchInput name="allows_private_channels" label="Private Channels" layout="horizontal" />
                      </div>

                      <div className="col-md-6 mb-2 plans-switch">
                        <SwitchInput name="allows_file_sharing" label="File Sharing" layout="horizontal" />
                      </div>

                      <div className="col-md-6 mb-2 plans-switch">
                        <SwitchInput name="allows_video_calls" label="Video Calls" layout="horizontal" />
                      </div>

                      <div className="col-md-6 mb-2 plans-switch">
                        <SwitchInput name="allows_multiple_delete" label="Bulk Delete" layout="horizontal" />
                      </div>

                      {/* Additional Settings */}

                      <div className="col-md-6 mb-2 plans-switch">
                        <SwitchInput name="is_default" label="Default Plan" layout="horizontal" />
                      </div>

                      <div className="col-md-6 mb-2 plans-switch">
                        <SwitchInput
                          name="statusSwitch"
                          label="Status"
                          layout="horizontal"
                          onToggle={(checked) => {
                            setFieldValue('statusSwitch', checked)
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
                            {isSubmitting ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
                          </SolidButton>
                        </div>
                      </div>
                    </div>
                  </Form>
                </>
              )}
            </Formik>
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default PlanForm
