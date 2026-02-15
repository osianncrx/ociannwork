import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { SwitchInput } from '../../../shared/form-fields'

const NotificationAndMessageTab = () => {
  const { t } = useTranslation()

  return (
    <Container fluid>
      <SwitchInput
        formGroupClass="margin-b-20"
        name="email_notifications_enabled"
        labelClass="mb-0"
        label={t('email_notifications_enabled')}
      />
    </Container>
  )
}

export default NotificationAndMessageTab
