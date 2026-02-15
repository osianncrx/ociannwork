import { Link } from 'react-router-dom'
import { Col, Container, Row } from 'reactstrap'
import { ROUTES } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import CardWrapper from '../../shared/card/CardWrapper'
import SvgIcon from '../../shared/icons/SvgIcon'
import PlansTable from './PlansTable'

const Plans = () => {
  return (
    <Container fluid>
      <Row>
        <Col xl="12">
          <CardWrapper
            heading={{
              title: 'plans',
              subtitle: 'view_and_manage_frequently_asked_questions',
              headerChildren: (
                <div className="action-bar">
                  <Link to={ROUTES.ADD_PLAN}>
                    <SolidButton className="btn-bg-primary">
                      <SvgIcon className="common-svg-hw me-2 plus-icon" iconId="plus-icon" />
                      Add Plan
                    </SolidButton>
                  </Link>
                </div>
              ),
            }}
          >
            <PlansTable />
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default Plans
