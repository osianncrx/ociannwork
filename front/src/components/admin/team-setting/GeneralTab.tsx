import { useTranslation } from 'react-i18next'
import { Container } from 'reactstrap'
import { SwitchInput, TextInput } from '../../../shared/form-fields'
import { usePlanFeatures } from '../../../utils/hooks'

const GeneralTab = () => {
  const { t } = useTranslation()
  const { allowsVideoCalls } = usePlanFeatures()

  return (
    <Container fluid>
      {allowsVideoCalls() && (
        <SwitchInput formGroupClass="margin-b-20" name="video_calls_enabled" labelClass="mb-0" label={t('video_calls')} />
      )}
      <SwitchInput formGroupClass="margin-b-20" name="audio_calls_enabled" labelClass="mb-0" label={t('audio_calls')} />
      <SwitchInput
        formGroupClass="margin-b-20"
        name="screen_sharing_in_calls_enabled"
        labelClass="mb-0"
        label={t('call_screen_sharing')}
      />
      <SwitchInput
        formGroupClass="margin-b-20"
        name="audio_messages_enabled"
        labelClass="mb-0"
        label={t('audio_messages')}
      />
      
      <TextInput
        formGroupClass="margin-b-20"
        type="number"
        name="maximum_message_length"
        label={t('maximum_message_length')}
        min={1}
        placeholder={t('enter_limit')}
      />
    </Container>
  )
}

export default GeneralTab
