import { Form, Formik } from 'formik'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button/SolidButton'
import { TextInput } from '../../../../shared/form-fields'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { setTeam } from '../../../../store/slices/teamSlice'
import { toaster } from '../../../../utils/custom-functions'
import { nameSchema, yupObject } from '../../../../utils/validation-schemas'
import { EditProfileProps } from '../../../../types'

const UpdateTeamForm: FC<EditProfileProps> = ({
  profileImageFile,
  removeAvatar = false,
  setProfileImageFile,
  setRemoveAvatar,
  setPreviewImage,
}) => {
  const { mutate: updateTeamProfile, isPending } = mutations.useUpdateTeam()
  const { team } = useAppSelector((store) => store.team)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleSubmit = async (values: { team_name: string }) => {
    const formData = new FormData()
    formData.append('team_name', values.team_name)

    if (removeAvatar) {
      formData.append('remove_avatar', 'true')
    } else if (profileImageFile instanceof File) {
      formData.append('team_avatar', profileImageFile)
    }

    updateTeamProfile(formData, {
      onSuccess: (response) => {
        const message = response?.message || t('team_profile_updated_successfully')
        toaster('success', message)
        dispatch(
          setTeam({
            ...team,
            avatar: response.team?.avatar || null,
            name: response.team?.name,
          }),
        )
        setProfileImageFile?.(null)
        setRemoveAvatar?.(false)
        setPreviewImage?.(null)
      },
      onError: () => {
        setProfileImageFile?.(null)
        setRemoveAvatar?.(false)
        setPreviewImage?.(null)
      },
    })
  }

  return (
    <Formik
      initialValues={{
        team_name: team?.name || '',
      }}
      validationSchema={yupObject({
        team_name: nameSchema(t('team_name')),
      })}
      enableReinitialize
      onSubmit={handleSubmit}
      validateOnBlur={false}
    >
      {() => (
        <Form className="login-form">
          <Row className="margin-b-12">
            <Col xs="12" md="6">
              <TextInput
                layout="vertical"
                className="custom-input"
                label={t('team_name')}
                name="team_name"
                placeholder={t('enter_team_name')}
                onlyAlphabets
              />
            </Col>
          </Row>
          <div className="form-actions">
            <SolidButton loading={isPending} title={t('save')} type="submit" color="primary" />
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default UpdateTeamForm
