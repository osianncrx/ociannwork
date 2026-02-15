import { Card, CardBody, CardHeader, Col } from "reactstrap";
import Chart from 'react-apexcharts';
import { monthlyTargetData } from "../../../data";

const Analytics = () => {
    return (
        <Col>
            <Card>
                <CardHeader className="card-no-border">
                    <div className="header-top">
                        <h5>Analytics</h5>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="monthly-target">
                        <div className="position-relative">
                            <Chart options={monthlyTargetData} series={monthlyTargetData.series} type="radialBar" height={230} />
                        </div>
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default Analytics
