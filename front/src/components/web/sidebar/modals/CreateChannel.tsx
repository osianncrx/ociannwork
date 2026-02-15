import { Form, Formik } from 'formik'
import { FC } from 'react'
import { Col } from 'reactstrap'
import * as Yup from 'yup'
import { mutations } from '../../../../api'
import { ChatType } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { SearchableSelectInput, TextInput } from '../../../../shared/form-fields'
import UserChannelSelector from '../../../../shared/form-fields/UserChannelInput'
import { SimpleModal } from '../../../../shared/modal'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { selectChat } from '../../../../store/slices/chatSlice'
import { CreateChannelFormValues, CreateChannelProps } from '../../../../types'
import { dynamicNameSchema } from '../../../../utils/validation-schemas'

const CreateChannel: FC<CreateChannelProps> = ({ createChannelModal, setCreateChannelModal }) => {
  const { mutate, isPending } = mutations.useChannelCreate()
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const authUserId = user?.id

  const handleSubmit = async (values: CreateChannelFormValues) => {
    debugger
    const memberIds = Array.isArray(values.members) ? values.members.map((member: any) => Number(member.value)) : []

    mutate(
      {
        name: values.name,
        description: values.description,
        type: values.type,
        member_ids: memberIds,
      },
      {
        onSuccess: (data) => {
          const { channel } = data
          dispatch(
            selectChat({
              type: ChatType.Channel,
              id: channel.id,
              name: channel?.name || `Channel ${channel?.id}`,
              email: null,
              avatar: channel?.avatar || null,
              profile_color: channel.profile_color,
              latest_message_at: channel.created_at || new Date().toISOString(),
              pinned: false,
              last_message: null,
              members: channel?.members || [],
              unread_count: 1,
            }),
          )
          setCreateChannelModal(false)
        },
      },
    )
  }

  const validationSchema = Yup.object({
    name: dynamicNameSchema('Channel name'),
    description: dynamicNameSchema('Description'),
    members: Yup.array()
      .min(1, 'At least one member is required')
      .required('Members are required')
      .test('has-members', 'At least one member is required', function (value) {
        return Array.isArray(value) && value.length > 0
      }),
  })

  return (
    <SimpleModal
      isOpen={createChannelModal}
      onClose={() => setCreateChannelModal(false)}
      title="Create a New Channel"
      size="md"
    >
      <Formik
        initialValues={{
          name: '',
          description: '',
          type: 'public',
          members: [],
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        validateOnBlur={false}
        validateOnChange={false}
      >
        {({ setFieldValue, values, touched, errors }) => {
          return (
            <Form className="row g-3">
              <Col xs={12}>
                <TextInput
                  layout="vertical"
                  label="Channel Name"
                  name="name"
                  type="text"
                  placeholder="Dev squad, kudos corner, design hub, etc..."
                  className="custom-input"
                />
              </Col>

              <Col xs={12}>
                <TextInput
                  layout="vertical"
                  label="Description"
                  name="description"
                  type="textarea"
                  placeholder="Enter a short description for your channel"
                  className="custom-input"
                />
              </Col>

              <Col xs={12}>
                <UserChannelSelector
                  layout="vertical"
                  label="Members"
                  name="members"
                  placeholder="Select members..."
                  isMulti={true}
                  includeUsers={true}
                  includeChannels={false}
                  excludeIds={[authUserId]}
                  value={values.members}
                  onSelectionChange={(selectedOptions) => {
                    const selectedMembers = Array.isArray(selectedOptions) ? selectedOptions : []
                    setFieldValue('members', selectedMembers)
                  }}
                  touched={touched.members}
                  error={errors.members}
                  noWrapper={false}
                  className="create-channel-scroll"
                />
              </Col>
              <Col xs={12}>
                <SearchableSelectInput
                  layout="vertical"
                  label="channel_type"
                  name="type"
                  options={[
                    { label: 'Public', value: 'public' },
                    { label: 'Private', value: 'private' },
                  ]}
                  value={{
                    label: values.type === 'public' ? 'Public' : 'Private',
                    value: values.type,
                  }}
                  onOptionChange={(option: any) => {
                    setFieldValue('type', option.value)
                  }}
                  isClearable={false}
                  touched={touched.type}
                  error={errors.type as string}
                />
              </Col>

              <Col xs={12}>
                <SolidButton
                  title="Submit"
                  loading={isPending}
                  type="submit"
                  color="primary"
                  className="w-100 login-btn"
                />
              </Col>
            </Form>
          )
        }}
      </Formik>
    </SimpleModal>
  )
}

export default CreateChannel
