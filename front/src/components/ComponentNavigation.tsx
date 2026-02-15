import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import WebLayout from '../layout/web'
import Error403 from '../pages/ErrorPage403'
import { useAppSelector } from '../store/hooks'
import { setScreen } from '../store/slices/screenSlice'
import { Screen } from '../types'
import { getStorage } from '../utils'
import Email from './onboarding/auth/email'
import ForgotPassword from './onboarding/auth/forgot-password'
import NewPassword from './onboarding/auth/new-password'
import OtpVerification from './onboarding/auth/otp-verification'
import Password from './onboarding/auth/password'
import ChannelBanner from './onboarding/channel/channel-banner'
import CreateChannel from './onboarding/channel/create-channel'
import ScreenLoad from './onboarding/screen-load'
import CreateTeam from './onboarding/team/create-team'
import CustomFields from './onboarding/team/custom-fields'
import DiscoverTeam from './onboarding/team/discover-team'
import InviteTeam from './onboarding/team/invite-team'
import SetupProfile from './onboarding/team/setup-profile'
import WelcomeTeam from './onboarding/team/welcome-team'
import TermReview from './onboarding/term-review'

const authScreens: Screen[] = ['email', 'password', 'forgotPassword', 'otp', 'resetPassword']

const ComponentNavigation = () => {
  const dispatch = useDispatch()
  const screen = useAppSelector((store) => store.screen.screen)
  const [isScreenLoaded, setIsScreenLoaded] = useState(false)
  const storage = getStorage()

  useEffect(() => {
    const savedScreen = storage.getItem('currentScreen') as Screen | null
    const redirectAfterTerms = storage.getItem('redirectAfterTerms') as Screen | null
    const validScreens: Screen[] = [
      'email',
      'password',
      'forgotPassword',
      'otp',
      'resetPassword',
      'createTeam',
      'setupProfile',
      'discoverTeam',
      'welcome',
      'webScreen',
      'termsAndConditions',
      'inviteTeam',
      'channelBanner',
      'customFields',
      'createChannel',
    ]

    if (savedScreen === 'webScreen') {
      dispatch(setScreen('webScreen'))
    } else if (redirectAfterTerms) {
      dispatch(setScreen('redirectScreen'))
    }
    else if (savedScreen && validScreens.includes(savedScreen)) {
      if (authScreens.includes(savedScreen)) {
        dispatch(setScreen('email'))
      } else {
        storage.setItem('redirectAfterTerms', savedScreen)
        dispatch(setScreen('redirectScreen'))
      }
    }
    // Default case
    else {
      dispatch(setScreen('email'))
    }

    setIsScreenLoaded(true)
  }, [dispatch])

  useEffect(() => {
    if (screen && screen !== 'redirectScreen') {
      storage.setItem('currentScreen', screen)
    }
  }, [screen])

  if (!isScreenLoaded) return null

  return (
    <>
      {screen === 'email' && <Email />}
      {screen === 'password' && <Password />}
      {screen === 'forgotPassword' && <ForgotPassword />}
      {screen === 'otp' && <OtpVerification />}
      {screen === 'resetPassword' && <NewPassword />}
      {screen === 'createTeam' && <CreateTeam />}
      {screen === 'setupProfile' && <SetupProfile />}
      {screen === 'discoverTeam' && <DiscoverTeam />}
      {screen === 'welcome' && <WelcomeTeam />}
      {screen === 'termsAndConditions' && <TermReview />}
      {screen === 'redirectScreen' && <ScreenLoad />}
      {screen === 'webScreen' && <WebLayout />}
      {screen === 'customFields' && <CustomFields />}
      {screen === 'channelBanner' && <ChannelBanner />}
      {screen === 'createChannel' && <CreateChannel />}
      {screen === 'inviteTeam' && <InviteTeam />}
      {screen === 'Error403' && <Error403 />}
    </>
  )
}

export default ComponentNavigation
