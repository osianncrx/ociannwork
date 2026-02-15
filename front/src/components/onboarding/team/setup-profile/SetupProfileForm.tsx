import { Form, Formik } from 'formik'
import { useState } from 'react'
import { Col, Row } from 'reactstrap'
import { mutations } from '../../../../api'
import { STORAGE_KEYS, TeamRole } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import { PhoneInput, TextInput } from '../../../../shared/form-fields'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createTeamSuccess, loginSuccess } from '../../../../store/slices/authSlice'
import { setScreen } from '../../../../store/slices/screenSlice'
import { removeTeamName, setTeam, setTeamRole } from '../../../../store/slices/teamSlice'
import { getStorage } from '../../../../utils'
import { toaster } from '../../../../utils/custom-functions'
import { useCountry } from '../../../../utils/hooks/useCountry'
import {
  dynamicNameSchema,
  passwordSchema,
  phoneSchema,
  verifyPasswordSchema,
  yupObject,
} from '../../../../utils/validation-schemas'
import { SetupProfileFormValues } from '../../../../types'

const SetupProfileForm = () => {
  const dispatch = useAppDispatch()
  const storage = getStorage()
  const { teamName } = useAppSelector((store) => store.team)
  const { mutate: setProfile, isPending: setupProfileLoading } = mutations.useSetupProfile()
  const { mutate: createTeam, isPending: createTeamLoading } = mutations.useTeamCreate()
  const showProfileScreenRaw = storage.getItem(STORAGE_KEYS.SHOW_PROFILE_SCREEN)
  const showProfileScreen = showProfileScreenRaw === 'true'
  const checkEmail = storage.getItem(STORAGE_KEYS.CHECK_EMAIL) || null
  const { getCountryNameByCode } = useCountry()

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm_password: false,
  })

  const handleShowPassword = (field: keyof typeof showPassword) => {
    setShowPassword({ ...showPassword, [field]: !showPassword[field] })
  }

  const handleSetupProfile = async (values: SetupProfileFormValues) => {
    try {
      const fullName = `${values.firstName} ${values.lastName}`.trim()
      const countryName = getCountryNameByCode(values.countryCode)
      if (!showProfileScreen && teamName) {
        createTeam(
          {
            email: checkEmail,
            name: fullName,
            team_name: teamName,
            password: values.password,
            country_code: values.countryCode,
            country: countryName,
            phone: values.phoneNumber,
          },
          {
            onSuccess: (response) => {
              if (response?.teamMember?.role == TeamRole.Admin) {
                dispatch(createTeamSuccess(response))
                dispatch(setTeamRole(response.teamMember?.role))
                dispatch(setTeam(response.team))
                dispatch(setScreen('inviteTeam'))
                dispatch(removeTeamName())
              }
            },
          },
        )
      } else {
        setProfile(
          {
            email: checkEmail,
            name: fullName,
            password: values.password,
            phone: values.phoneNumber,
            country_code: values.countryCode,
            country: countryName,
          },
          {
            onSuccess: (res) => {
              if (res.token) {
                dispatch(loginSuccess(res))
                dispatch(setScreen('welcome'))
              }
            },
          },
        )
      }
    } catch (error: any) {
      toaster('error', error?.message)
    }
  }

  return (
    <Formik
      initialValues={{
        firstName: '',
        lastName: '',
        phoneNumber: '',
        countryCode: '1',
        password: '',
        email: storage.getItem('check_email') || '',
        confirmPassword: '',
      }}
      validationSchema={yupObject({
        firstName: dynamicNameSchema('First Name'),
        lastName: dynamicNameSchema('Last Name'),
        phoneNumber: phoneSchema,
        password: passwordSchema,
        confirmPassword: verifyPasswordSchema,
      })}
      onSubmit={handleSetupProfile}
      validateOnBlur={false}
      validateOnChange={false}
    >
      {() => (
        <Form className="login-form">
          <div className="login-input">
            <Row className="g-3 margin-b-19">
              <Col md="6" xs="12">
                <TextInput
                  autoFocus
                  layout="vertical"
                  className="custom-input"
                  placeholder="Ethan"
                  label="first_name"
                  name="firstName"
                  type="text"
                  onlyAlphabets
                />
              </Col>
              <Col xs="12" md="6">
                <TextInput
                  layout="vertical"
                  className="custom-input"
                  placeholder="Walker"
                  label="last_name"
                  name="lastName"
                  type="text"
                  onlyAlphabets
                />
              </Col>
              <Col xs="12">
                <TextInput
                  layout="vertical"
                  className="custom-input"
                  placeholder=""
                  label="email_address"
                  name="email"
                  type="text"
                  readOnly
                />
              </Col>
              <Col xs="12">
                <PhoneInput xxlClass={3} xxlClass2={9} label="phone" name="phoneNumber" codeName="countryCode" />
              </Col>
              <Col xs="12">
                <TextInput
                  layout="vertical"
                  label="password"
                  iconProps={{ iconId: 'lock', className: 'form-icon form-mark' }}
                  name="password"
                  type={showPassword.password ? 'text' : 'password'}
                  placeholder="**********"
                  children={
                    <div className="password-wrap password-box " onClick={() => handleShowPassword('password')}>
                      {showPassword.password ? (
                        <SvgIcon className="icon-eye" iconId="show-eye" />
                      ) : (
                        <SvgIcon className="icon-eye" iconId="hide-eye" />
                      )}
                    </div>
                  }
                />
              </Col>
              <Col xs="12">
                <TextInput
                  layout="vertical"
                  label="confirm_password"
                  iconProps={{ iconId: 'lock', className: 'form-icon form-mark  ' }}
                  name="confirmPassword"
                  type={showPassword.confirm_password ? 'text' : 'password'}
                  placeholder="**********"
                  children={
                    <div className="password-wrap password-box" onClick={() => handleShowPassword('confirm_password')}>
                      {showPassword.confirm_password ? (
                        <SvgIcon className="icon-eye" iconId="show-eye" />
                      ) : (
                        <SvgIcon className="icon-eye" iconId="hide-eye" />
                      )}
                    </div>
                  }
                />
              </Col>
            </Row>
            <SolidButton
              loading={createTeamLoading || setupProfileLoading}
              type="submit"
              color="primary"
              className="w-100 login-btn"
              title="submit"
            />
          </div>
        </Form>
      )}
    </Formik>
  )
}

export default SetupProfileForm
