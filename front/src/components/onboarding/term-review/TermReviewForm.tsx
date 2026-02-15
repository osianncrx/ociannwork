import { useTranslation } from 'react-i18next'
import { mutations } from '../../../api'
import { STORAGE_KEYS, TeamRole } from '../../../constants'
import { SolidButton } from '../../../shared/button'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { hideLoader, showLoader } from '../../../store/slices/loaderSlice'
import { setScreen } from '../../../store/slices/screenSlice'
import { removeTeamName, setTeam, setTeamRole } from '../../../store/slices/teamSlice'
import { getStorage } from '../../../utils'
import { useState } from 'react'
import Terms from './Terms'
import PrivacyPolicy from './PrivacyPolicy'

const TermReviewForm = () => {
  const dispatch = useAppDispatch()
  const { loading } = useAppSelector((store) => store.loader)
  const storage = getStorage()
  const { mutate: addNewTeam, isPending } = mutations.useAddNewTeam()
  const isAddingTeam = storage.getItem(STORAGE_KEYS.ADDING_TEAM) || false
  const { teamName } = useAppSelector((store) => store.team)
  const { t } = useTranslation()
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false)
  const { pages } = useAppSelector((state) => state.publicSetting)
  const termsData = pages?.find((item) => item.slug === 'terms')
  const privacyPolicyData = pages?.find((item) => item.slug === 'privacy-policy')
  const toggleTerms = () => {
    if (termsData) setIsTermsOpen(!isTermsOpen)
  }
  const togglePrivacyPolicy = () => {
    if (privacyPolicyData) setIsPrivacyPolicyOpen(!isPrivacyPolicyOpen)
  }

  const handleSubmit = () => {
    dispatch(showLoader())

    if (teamName && !isAddingTeam) {
      dispatch(setScreen('setupProfile'))
    } else {
      if (teamName && isAddingTeam) {
        addNewTeam(
          {
            team_name: teamName,
          },
          {
            onSuccess: (response) => {
              dispatch(setTeam(response.team))
              dispatch(setTeamRole(TeamRole.Admin))
              dispatch(removeTeamName())
              storage.removeItem(STORAGE_KEYS.SELECTED_CHAT)
              dispatch(setScreen('inviteTeam'))
            },
          },
        )
      }
      dispatch(hideLoader())
    }
  }
  return (
    <>
      <p className="small">
        These user terms of service govern your access and use of our online workplace productivity tools and platform.
        Please read them carefully. Even though you are signing onto an existing workspace, these user terms apply to
        you-the prospective user reading these words. We are grateful you're here.
      </p>

      <div className="teams-data gap-bottom text-start">
        <span className="consent-footer">By choosing “I Agree”, you understand and agree to app's</span>
        <div className="team-link">
          <div className="flex-between gap-2">
            <div className="team-link-text" onClick={toggleTerms}>
              {t('terms_of_use')}
            </div>
            <span>{t('and')}</span>
            <div className="team-link-text" onClick={togglePrivacyPolicy}>
              {t('privacy_policy')}
            </div>
          </div>
        </div>
      </div>
      <SolidButton
        title="i_agree"
        loading={loading || isPending}
        type="submit"
        color="primary"
        className="w-100 login-btn"
        onClick={handleSubmit}
      />
      <Terms isOpen={isTermsOpen} toggle={toggleTerms} />
      <PrivacyPolicy isOpen={isPrivacyPolicyOpen} toggle={togglePrivacyPolicy} />
    </>
  )
}

export default TermReviewForm
