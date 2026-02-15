import { Button, Card, CardBody, CardHeader, CardTitle } from 'reactstrap'
import SvgIcon from '../../shared/icons/SvgIcon'

const Notifications = () => {
  return (
    <li className="notification-down nav-menu-li on-hover-dropdown">
      <div className="notification-box">
        <SvgIcon iconId="notification-header" className="common-svg-hw" />
        <span className="badge rounded-pill badge-primary">3</span>
      </div>
      <div className="onhover-show-div notification-dropdown ">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No Notification</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="notification">
              <div>
                <span>Congrats! you all task for today.</span>
                <span>Today 11:45pm</span>
              </div>
              <Button color="outline-lg-primary" className="badge-outline-lg-primary">
                Show
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </li>
  )
}

export default Notifications
