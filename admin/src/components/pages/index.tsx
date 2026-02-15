import { Link } from 'react-router-dom'
import { Col, Container, Row } from 'reactstrap'
import { ROUTES } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import SvgIcon from '../../shared/icons/SvgIcon'
import PagesTable from './PagesTable'

const Pages = () => {
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'manage_pages',
              subtitle: 'view_and_manage_pages',
              headerChildren: (
                <div className="action-bar">
                  <Link to={ROUTES.ADD_PAGE}>
                    <SolidButton className="btn-bg-primary">
                      <SvgIcon className="common-svg-hw me-2 plus-icon" iconId="plus-icon" />
                      Add Page
                    </SolidButton>
                  </Link>
                </div>
              ),
            }}
          >
            <PagesTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default Pages
