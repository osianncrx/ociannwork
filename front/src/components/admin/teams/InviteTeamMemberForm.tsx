import { FieldArray, Formik, FormikErrors } from 'formik'
import { FormGroup, InputGroup } from 'reactstrap'
import * as Yup from 'yup'
import { SolidButton } from '../../../shared/button/SolidButton'
import TextInput from '../../../shared/form-fields/TextInput'
import { mailSchema } from '../../../utils/validation-schemas'
import { useTranslation } from 'react-i18next'
import { SvgIcon } from '../../../shared/icons'
import { mutations } from '../../../api'
import { toaster } from '../../../utils/custom-functions'
import ModalFormWrapper from '../widgets/ModalFormWrapper'
import { useCallback, useEffect, useRef, FormEvent, RefCallback } from 'react'
import { InviteTeamFormValues, InviteTeamMemberModalProps } from '../../../types'

const InviteTeamMemberForm = ({ isOpen, toggle }: InviteTeamMemberModalProps) => {
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
    emails: Yup.array().of(mailSchema).min(1, t('at_least_one_email_is_required')),
  })

  const handleSubmit = (values: InviteTeamFormValues) => {
    const validEmails = values.emails.filter((email) => email.trim() !== '')
    if (validEmails.length) {
      mutate(
        {
          emails: validEmails,
        },
        {
          onSuccess: () => {
            toaster('success', t('invitation_sent'))
          },
          onError: (error: any) => {
            if (Array.isArray(error?.response?.data)) {
              error.response.data.forEach((msg: { message: string }) => {
                toaster('error', msg.message)
              })
            } else {
              toaster('error', error?.response?.data?.message)
            }
          },
        },
      )
    }
  }

  return (
    <Formik<InviteTeamFormValues>
      initialValues={{ emails: [''] }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      validateOnBlur={true}
    >
      {({ values, validateForm, handleSubmit, setFieldTouched, resetForm }) => {
        useEffect(() => {
          if (!isOpen) {
            resetForm()
          }
        }, [isOpen, resetForm])

        return (
          <ModalFormWrapper
            isOpen={isOpen}
            toggle={toggle}
            title={t('invite_team_member')}
            iconId="user-add"
            isLoading={isPending}
            submitLabel={t('send_invite')}
            cancelLabel={t('cancel')}
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            <FieldArray name="emails">
              {({ remove, push }) => (
                <>
                  <label className="margin-b-12 f-w-500 ">{t('team_members_email')}</label>
                  {values.emails.map((_, index) => (
                    <FormGroup key={index}>
                      <InputGroup className="gap-2 flex-nowrap">
                        <TextInput
                          className="custom-input "
                          name={`emails.${index}`}
                          placeholder={t('enter_member_email')}
                          containerClass="flex-grow-1 w-100 custom-input"
                          formGroupClass="w-100"
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
                    type="button"
                    color="link"
                    className="recover-ease d-flex link-text"
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
          </ModalFormWrapper>
        )
      }}
    </Formik>
  )
}

export default InviteTeamMemberForm
