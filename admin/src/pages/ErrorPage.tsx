import { useNavigate } from "react-router-dom"
import { useAppSelector } from "../store/hooks"
import { ROUTES } from "../constants"
import { Container } from "reactstrap"
import { Image } from "../shared/image"
import SvgIcon from "../shared/icons/SvgIcon"

const ErrorPage = () => {
  const navigate = useNavigate()
  const { page_404_title, page_404_content, page_404_image_url } = useAppSelector((state) => state.setting)

  const handleBackToHome = () => {
    navigate(ROUTES.DASHBOARD)
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
export default ErrorPage
