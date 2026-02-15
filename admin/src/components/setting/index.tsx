import { Form, Formik, FormikHelpers } from 'formik'
import { useState } from 'react'
import { Col, Container, Row, TabContent, TabPane } from 'reactstrap'
import { mutations, queries } from '../../api'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import TabHeader from '../../shared/tab/TabHeader'
import { SettingFormValues } from '../../types'
import { toaster } from '../../utils/custom-functions'
import { yupObject } from '../../utils/validation-schemas'
import EmailConfigurationTab from './EmailConfigurationTab'
import GeneralTab from './GeneralTab'
import { FALLBACKS } from '../../constants/fallbacks'
import ContactDetails from './ContactDetails'
import MaintenanceMode from './maintenanceMode'

const Setting = () => {
  const [activeTab, setActiveTab] = useState('general')
  const { data } = queries.useGetSettings()
  const { mutate, isPending } = mutations.useUpdateSetting()

  const handleSubmit = (values: SettingFormValues, { setSubmitting }: FormikHelpers<SettingFormValues>) => {
    const formData = new FormData()

    const isFile = (val: unknown): val is File => val instanceof File

    Object.keys(values).forEach((key) => {
      const field = key as keyof SettingFormValues
      const value = values[field]

      if (isFile(value)) {
        formData.append(field, value)
      } else if (value === null) {
        formData.append(field, 'null')
      } else if (value !== undefined) {
        formData.append(field, String(value))
      }
    })

    mutate(formData, {
      onSuccess: () => toaster('success', 'Settings updated successfully'),
      onSettled: () => setSubmitting(false),
    })
  }

  const tabItems = [
    { id: 'general', icon: 'setting-stroke', label: 'General' },
    { id: 'contactDetails', icon: 'mail-stroke', label: 'Contact Details' },
    { id: 'email', icon: 'mail-stroke', label: 'Email Configuration' },
    { id: 'maintenanceMode', icon: 'mail-stroke', label: 'Maintenance Mode' },
  ]

  const initialValues: SettingFormValues = {
    site_name: data?.settings?.site_name || '',
    site_description: data?.settings?.site_description || '',
    logo_light: data?.settings?.logo_light_url || null,
    logo_dark: data?.settings?.logo_dark_url || '',
    favicon: data?.settings?.favicon_url || '',
    sidebar_logo: data?.settings?.sidebar_logo_url || '',
    otp_digits: data?.settings?.otp_digits || FALLBACKS.OtpLength,
    otp_expiration_minutes: data?.settings?.otp_expiration_minutes || '',
    support_email: data?.settings?.support_email || '',
    company_address: data?.settings?.company_address || '',
    contact_email: data?.settings?.contact_email || '',
    contact_phone: data?.settings?.contact_phone || '',
    no_internet_title: data?.settings?.no_internet_title || '',
    no_internet_content: data?.settings?.no_internet_content || '',
    no_internet_image: data?.settings?.no_internet_image_url || '',
    page_404_title: data?.settings?.page_404_title || '',
    page_404_content: data?.settings?.page_404_content || '',
    page_404_image: data?.settings?.page_404_image_url || '',
    smtp_host: data?.settings?.smtp_host || '',
    smtp_port: data?.settings?.smtp_port || '',
    smtp_user: data?.settings?.smtp_user || '',
    mail_from_name: data?.settings?.mail_from_name || '',
    mail_from_email: data?.settings?.mail_from_email || '',
    smtp_pass: data?.settings?.smtp_pass || '',
    maintenance_mode: data?.settings?.maintenance_mode || false,
    maintenance_image: data?.settings?.maintenance_image_url || '',
    maintenance_title: data?.settings?.maintenance_title || '',
    maintenance_message: data?.settings?.maintenance_message || '',
    favicon_notification_logo: data?.settings?.favicon_notification_logo_url || '',
    onboarding_logo: data?.settings?.onboarding_logo_url || '',
    landing_logo: data?.settings?.landing_logo_url || '',
  }

  return (
    <Formik enableReinitialize initialValues={initialValues} validationSchema={yupObject({})} onSubmit={handleSubmit}>
      {({ isSubmitting }) => (
        <Container fluid>
          <Row>
            <Col xl="12">
              <CardWrapper
                heading={{
                  title: 'Settings',
                }}
              >
                <Form className="login-form" encType="multipart/form-data">
                  <TabHeader activeId={activeTab} setActiveId={setActiveTab} tabs={tabItems} />
                  <TabContent activeTab={activeTab}>
                    <TabPane tabId="general">
                      <GeneralTab />
                    </TabPane>
                    <TabPane tabId="contactDetails">
                      <ContactDetails />
                    </TabPane>
                    <TabPane tabId="email">
                      <EmailConfigurationTab />
                    </TabPane>
                    <TabPane tabId="maintenanceMode">
                      <MaintenanceMode />
                    </TabPane>
                  </TabContent>
                  <div className="form-actions">
                    <SolidButton loading={isPending || isSubmitting} color="primary" title="submit" type="submit" />
                  </div>
                </Form>
              </CardWrapper>
            </Col>
          </Row>
        </Container>
      )}
    </Formik>
  )
}
export default Setting
