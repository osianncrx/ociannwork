import { Card, CardBody } from 'reactstrap'
import SvgIcon from '../../shared/icons/SvgIcon'
import { Stats } from '../../types'
import CountUp from 'react-countup'

const StatWidget = ({ icon, count, label, trendValue, isIncrease }: Stats) => {
  return (
    <Card className="widget">
      <CardBody>
        <div className="widget-content">
          <div className="widget-round secondary">
            <img src={icon} alt={label} />
          </div>
          <div>
            <h4>
              <span className="counter" data-target={count}>
                <CountUp end={count} />
              </span>
            </h4>
            <span className="f-light">{label}</span>
          </div>
        </div>
        <div className={`font-success ${isIncrease ? 'increasing' : 'decreasing'} f-w-500`}>
          <SvgIcon className="common-svg-hw" iconId={isIncrease ? 'increase' : 'decrease'} />
          <span className={isIncrease ? 'txt-success' : 'txt-danger'}>{trendValue.toFixed(2)}%</span>
        </div>
      </CardBody>
    </Card>
  )
}

export default StatWidget
