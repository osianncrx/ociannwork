import { Formik } from 'formik'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Col, Row } from 'reactstrap'
import { SolidButton } from '../../../../../shared/button/SolidButton'
import { TextInput } from '../../../../../shared/form-fields'
import { ChangePasswordProps } from '../../../../../types'
import { updatePasswordSchema } from '../../../../../utils/validation-schemas'

const ChangePassword: FC<ChangePasswordProps> = ({ onSubmit, isPending }) => {
  const { t } = useTranslation()

  return (
    <div className="password-section">
      <Formik
        initialValues={{
          new_password: '',
          confirm_password: '',
          old_password: '',
        }}
        validationSchema={updatePasswordSchema}
        onSubmit={onSubmit}
        validateOnBlur={false}
      >
        {({ submitForm }) => (
          <div className="mt-3">
            <Row className="g-3">
              <Col md={6}>
                <TextInput
                  layout="vertical"
                  label={t('old_password')}
                  name="old_password"
                  type="password"
                  placeholder={t('enter_old_password')}
                />
              </Col>
              <Col md={6}>
                <TextInput
                  layout="vertical"
                  label={t('new_password')}
                  name="new_password"
                  type="password"
                  placeholder={t('enter_new_password')}
                />
              </Col>
              <Col md={6}>
                <TextInput
                  layout="vertical"
                  label={t('confirm_password')}
                  name="confirm_password"
                  type="password"
                  placeholder={t('retype_new_password')}
                />
              </Col>
            </Row>

            <div className="preferences-btn-box">
              <SolidButton
                loading={isPending}
                title={t('save')}
                type="button"
                color="primary"
                onClick={() => submitForm()}
              />
            </div>
          </div>
        )}
      </Formik>
    </div>
  )
}

export default ChangePassword
