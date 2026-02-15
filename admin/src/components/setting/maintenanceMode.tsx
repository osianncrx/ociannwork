import { Col, Container, Row } from 'reactstrap'
import { MediaInput, SwitchInput, TextInput } from '../../shared/form-fields'
import { useFormikContext } from 'formik'
import { useTranslation } from 'react-i18next'
import { AppSettings } from '../../types/store'

const MaintenanceMode = () => {
  const { t } = useTranslation()
  const { values, setFieldValue } = useFormikContext<Partial<AppSettings>>()

  return (
    <Container fluid>
      <Row>
        <Col md="6" className="margin-b-40">
          <MediaInput label="maintenance_image" name="maintenance_image" size="451px * 329px" />
        </Col>
        <Col>
          <Col md="12">
            <SwitchInput
              formGroupClass="margin-b-20"
              name="maintenance_mode"
              label={t('maintenance_mode')}
              onToggle={(checked) => setFieldValue('maintenance_mode', checked)}
              checked={values?.maintenance_mode}
              labelClass="mb-0"
            />
          </Col>
          <Col md="12">
            <TextInput name="maintenance_title" label="maintenance_title" placeholder="maintenance_title" />
          </Col>
          <Col md="12">
            <TextInput name="maintenance_message" label="maintenance_message" placeholder="maintenance_message" />
          </Col>
        </Col>
        <hr />
        <Col md="6" className="margin-b-40">
          <MediaInput label="no_internet_image" name="no_internet_image" size="300px * 150px" />
        </Col>
        <Col>
          <Col md="12">
            <TextInput name="no_internet_title" label="no_internet_title" placeholder="no_internet_title" />
          </Col>
          <Col md="12">
            <TextInput name="no_internet_content" label="no_internet_content" placeholder="no_internet_content" />
          </Col>
        </Col>
        <hr />
        <Col md="6" className="margin-b-40">
          <MediaInput label="page_404_image" name="page_404_image" size="559px * 434px" />
        </Col>
        <Col>
          <Col md="12">
            <TextInput name="page_404_title" label="page_404_title" placeholder="no_internet_title" />
          </Col>
          <Col md="12">
            <TextInput name="page_404_content" label="page_404_content" placeholder="no_internet_content" />
          </Col>
        </Col>
      </Row>
    </Container>
  )
}

export default MaintenanceMode
