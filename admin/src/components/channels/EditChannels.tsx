import { Formik, Form as FormikForm } from 'formik'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Col, Container, Row } from 'reactstrap'
import { mutations } from '../../api'
import { ROUTES } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import { TextInput } from '../../shared/form-fields'
import { CombinedErrorResponse, ChannelEditFormValues, LocationStateChannel, UpdateChannelResponse } from '../../types'
import { nameSchema, yupObject } from '../../utils/validation-schemas'
import EditProfile from './EditProfile'

const EditChannels: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { mutate: updateChannel, isPending } = mutations.useUpdateChannel()
  const channelData = (location.state as LocationStateChannel)?.channelData
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const [avatar, setAvatar] = useState<File | null>(null)

  const initialValues: ChannelEditFormValues = {
    name: channelData?.name || '',
    description: channelData?.description || '',
    email: channelData?.admins?.[0]?.email || '',
  }

  const getErrorMessage = (error: CombinedErrorResponse): string => {
    if (Array.isArray(error.data)) {
      return error.data[0]?.message || t('failed_to_update_channel')
    }

    if (error.data && typeof error.data === 'object') {
      const firstErrorKey = Object.keys(error.data)[0]
      if (firstErrorKey && Array.isArray(error.data[firstErrorKey])) {
        return t(`validation_errors.${error.data[firstErrorKey][0]?.code}`) || t('failed_to_update_channel')
      }
    }

    return t('failed_to_update_channel')
  }

  const handleSubmit = useCallback(
    async (values: ChannelEditFormValues): Promise<void> => {
      if (!channelData?.id) {
        toast.error('Channel ID is missing')
        return
      }

      const formData = new FormData()
      formData.append('id', channelData.id)
      formData.append('name', values.name)
      formData.append('description', values.description)

      if (removeAvatar) {
        formData.append('remove_avatar', 'true')
      } else if (avatar instanceof File) {
        formData.append('avatar', avatar)
      }

      return new Promise<void>((resolve, reject) => {
        updateChannel(formData, {
          onSuccess: (response: UpdateChannelResponse) => {
            const message = response?.message || 'channel_updated_successfully'
            toast.success(message)
            navigate(ROUTES.MANAGE_CHANNELS)
            resolve()
          },
          onError: (error: CombinedErrorResponse) => {
            const errorMessage = getErrorMessage(error)
            toast.error(errorMessage)
            reject(new Error(errorMessage))
          },
        })
      })
    },
    [avatar, removeAvatar, updateChannel, channelData?.id, navigate],
  )

  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: t('edit_channel'),
              subtitle: t('edit_details_of_channel'),
            }}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={yupObject({
                name: nameSchema(t('name')),
                description: nameSchema(t('description')),
              })}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {() => {
                return (
                  <FormikForm className="login-form custom-field">
                    <Row>
                      <Col lg="4">
                        <EditProfile
                          setAvatar={setAvatar}
                          removeAvatar={removeAvatar}
                          setRemoveAvatar={setRemoveAvatar}
                        />
                      </Col>
                      <Col lg="8">
                        <TextInput
                          layout="vertical"
                          className="custom-input"
                          formgroupclass="margin-b-25"
                          label={t('name')}
                          name="name"
                          labelclass="margin-b-10"
                          placeholder={t('enter_name')}
                          required
                        />
                        <TextInput
                          layout="vertical"
                          className="custom-input"
                          formgroupclass="margin-b-25"
                          label={t('description')}
                          name="description"
                          labelclass="margin-b-10"
                          placeholder={t('enter_description')}
                        />
                      </Col>
                    </Row>

                    <div className="form-actions mt-3">
                      <SolidButton
                        loading={isPending}
                        title={t('update')}
                        type="submit"
                        color="primary"
                        className="btn btn-primary"
                      />
                      <SolidButton
                        title={t('cancel')}
                        color="outline-light"
                        type="button"
                        onClick={() => navigate(ROUTES.MANAGE_CHANNELS)}
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
  )
}

export default EditChannels
