import { FieldArray, Form, Formik, FormikErrors } from 'formik'
import { useTranslation } from 'react-i18next'
import { FormGroup, InputGroup } from 'reactstrap'
import * as Yup from 'yup'
import { mutations } from '../../../../api'
import { SolidButton } from '../../../../shared/button/SolidButton'
import TextInput from '../../../../shared/form-fields/TextInput'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch } from '../../../../store/hooks'
import { setScreen } from '../../../../store/slices/screenSlice'
import { mailSchema } from '../../../../utils/validation-schemas'
import { RefCallback, useCallback, useRef } from 'react'
import { InviteTeamFormValues } from '../../../../types'

const InviteTeamForm = () => {
  const dispatch = useAppDispatch()
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
    emails: Yup.array().of(mailSchema).min(1, t('At least one email is required')),
  })

  const handleSubmit = (values: InviteTeamFormValues) => {
    const validEmails = values.emails.filter((email) => email.trim() !== '')
    if (validEmails.length) {
      mutate(
        { emails: validEmails },
        {
          onSuccess: () => {
            dispatch(setScreen('channelBanner'))
          },
        },
      )
    }
    dispatch(setScreen('channelBanner'))
  }

  return (
    <Formik<InviteTeamFormValues>
      initialValues={{ emails: [''] }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      validateOnBlur={true}
    >
      {({ values, setFieldTouched, validateForm }) => (
        <Form className="login-form">
          <FieldArray name="emails">
            {({ remove, push }) => (
              <>
                <label className="margin-b-12 d-flex">{t('team_members_email')}</label>
                <div className="invite-members-height custom-scrollbar">
                  {values.emails.map((_, index) => (
                    <FormGroup key={index}>
                      <InputGroup className="gap-2 w-100 flex-nowrap">
                        <TextInput
                          autoFocus
                          layout="vertical"
                          name={`emails.${index}`}
                          placeholder="enter_member_email"
                          containerClass="flex-grow-1 custom-input"
                          innerRef={setRef(index) as RefCallback<HTMLInputElement>}
                        />
                        {values.emails.length > 1 && (
                          <SolidButton
                            className="btn-bg-danger"
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
                </div>

                <SolidButton
                  type="button"
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

          <SolidButton title={'done'} loading={isPending} type="submit" color="primary" className="mt-4" />

          <div className="mt-3">
            <button
              type="button"
              onClick={() => dispatch(setScreen('channelBanner'))}
              className="link-text bg-transparent border-0"
            >
              {t('i_will_do_this_later')}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default InviteTeamForm
