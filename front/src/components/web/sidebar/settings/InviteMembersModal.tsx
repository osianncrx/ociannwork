import { FieldArray, Form, Formik, FormikErrors } from 'formik'
import { RefCallback, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FormGroup, InputGroup } from 'reactstrap'
import * as Yup from 'yup'
import { mutations } from '../../../../api'
import { strictMailSchema } from '../../../../utils/validation-schemas'
import { InviteMembersModalProps, InviteTeamFormValues } from '../../../../types'
import { SimpleModal } from '../../../../shared/modal'
import { TextInput } from '../../../../shared/form-fields'
import { SolidButton } from '../../../../shared/button'
import { SvgIcon } from '../../../../shared/icons'
import { toaster } from '../../../../utils/custom-functions'

const InviteMembersModal = ({ isOpen, toggle }: InviteMembersModalProps) => {
  const { mutate, isPending } = mutations.useInviteTeamMembers()
  const { t } = useTranslation()
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const setRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el
    },
    [],
  )

  const validationSchema = Yup.object().shape({
    emails: Yup.array().of(strictMailSchema).min(1, t('At least one email is required')),
  })

  const handleSubmit = (values: InviteTeamFormValues) => {
    const validEmails = values.emails.filter((email) => email.trim() !== '')
    if (validEmails.length) {
      mutate(
        { emails: validEmails },
        {
          onSuccess: () => {
            toggle()
            toaster('success', t('Member Invited.'))
          },
        },
      )
    }
  }

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={toggle}
      title={t('invite_your_team')}
      subtitle={t('invite_team_subtitle')}
      size="md"
    >
      <Formik<InviteTeamFormValues>
        initialValues={{ emails: [''] }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        validateOnBlur={false}
      > 
        {({ values, setFieldTouched, validateForm }) => (
          <Form>
            <FieldArray name="emails">
              {({ remove, push }) => (
                <>
                  <label className="mb-2 d-flex">{t('team_members_email')}</label>
                  {values.emails.map((_, index) => (
                    <FormGroup key={index}>
                      <InputGroup className="gap-2 w-100 flex-nowrap">
                        <TextInput
                          layout="vertical"
                          name={`emails.${index}`}
                          placeholder="enter_member_email"
                          containerClass="flex-grow-1 custom-input"
                          innerRef={setRef(index) as RefCallback<HTMLInputElement>}
                        />
                        {values.emails.length > 1 && (
                          <SolidButton
                            className="btn-bg-danger btn-delete"
                            onClick={() => {
                              remove(index)
                              if (values.emails.length === 1) {
                                setTimeout(() => push(''), 0)
                              }
                            }}
                          >
                            <SvgIcon iconId="table-delete" className="danger-fill-stroke common-svg-hw" />
                          </SolidButton>
                        )}
                      </InputGroup>
                    </FormGroup>
                  ))}

                  <SolidButton
                    color="link"
                    className="recover-ease d-flex"
                    onClick={async () => {
                      const formErrors: FormikErrors<InviteTeamFormValues> = await validateForm()
                      const emailErrors = formErrors.emails as (string | undefined)[] | undefined
                      const hasError = emailErrors?.some((err) => !!err)

                      if (hasError && emailErrors) {
                        const firstErrorIndex = emailErrors.findIndex((err) => !!err)
                        if (firstErrorIndex !== -1) {
                          inputRefs.current[firstErrorIndex]?.focus()
                          setFieldTouched(`emails.${firstErrorIndex}`, true)
                        }
                        return
                      }

                      push('')
                    }}
                  >
                    + {t('invite_more')}
                  </SolidButton>
                </>
              )}
            </FieldArray>

            <div className="d-flex gap-2 mt-4">
              <SolidButton title={'cancel'} color="light" onClick={toggle} className="flex-grow-1" />
              <SolidButton
                title={'invite_members'}
                loading={isPending}
                color="primary"
                className="flex-grow-1"
                type="submit"
              />
            </div>
          </Form>
        )}
      </Formik>
    </SimpleModal>
  )
}

export default InviteMembersModal
