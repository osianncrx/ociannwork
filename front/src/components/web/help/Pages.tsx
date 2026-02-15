import { Card, CardBody } from 'reactstrap'
import Renderer from '../chat/widgets/Renderer'
import { PagesProps } from '../../../types'

const Pages = ({ data, isLoading, isRefetching }: PagesProps) => {
  if (isLoading || isRefetching) {
    return (
      <div className="faq-section d-flex justify-content-center align-items-center">
        <div className="custom-loader-chat">
          <span className="loader-main-chat"></span>
        </div>
      </div>
    )
  }

  return (
    <div className="pages-section">
      <Card className="pages-title">
        <CardBody>
          <h4 className="text-grey">{data.title}</h4>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Renderer value={data.content} />
        </CardBody>
      </Card>
    </div>
  )
}

export default Pages
