import { Container } from 'reactstrap'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants'
import { SvgIcon } from '../shared/icons'
import { useAppSelector } from '../store/hooks'
import { Image } from '../shared/image'

const Error404 = () => {
  const navigate = useNavigate()
  const { page_404_title, page_404_content, page_404_image_url } = useAppSelector((state) => state.setting)

  const handleBackToHome = () => {
    navigate(ROUTES.ADMIN.PROFILE)
  }

  return (
    <Container fluid className="login-wrapper auth-background text-center flex-center min-vh-100">
      <div className="error-wrapper">
        <div className="svg-wrapper">
          {page_404_image_url ? <Image src={page_404_image_url} /> : <SvgIcon iconId="error-page" />}
        </div>
        <h2 className="text-muted">{page_404_title}</h2>
        <p className="text-muted">{page_404_content}</p>
        <div>
          <button className="btn btn-primary my-3" onClick={handleBackToHome}>
            Back to Home
          </button>
        </div>
      </div>
    </Container>
  )
}

export default Error404
