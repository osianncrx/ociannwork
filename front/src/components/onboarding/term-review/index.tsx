import { useTranslation } from 'react-i18next'
import { SvgIcon } from '../../../shared/icons'
import { useAppDispatch } from '../../../store/hooks'
import { setScreen } from '../../../store/slices/screenSlice'
import { removeTeamName } from '../../../store/slices/teamSlice'
import OnboardingWrapper from '../widgets/OnboardingWrapper'
import TermReviewForm from './TermReviewForm'

const TermReview = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const handleRedirectToTeams = () => {
    dispatch(removeTeamName())
    dispatch(setScreen('createTeam'))
  }
  
  return (
    <OnboardingWrapper>
      <div className="content-title">
        <div className="back-btn-badge" onClick={handleRedirectToTeams}>
          <SvgIcon className="back-btn-icon" iconId="back-arrow-icon" />
        </div>
        <h1>{t('please_review_the_user_terms_of_service')}</h1>
      </div>
      <p className="mb-1">
        {t('effective')}: <span className="date-title">May 23, 2025</span>
      </p>
      <TermReviewForm />
    </OnboardingWrapper>
  )
}

export default TermReview
