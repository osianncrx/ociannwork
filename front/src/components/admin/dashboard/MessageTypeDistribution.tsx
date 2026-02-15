import { Card, CardBody, CardHeader } from "reactstrap";
import Chart from 'react-apexcharts';
import { messageTypeDistributionOptions } from "../../../data";
import { DashboardProps } from "../../../types/components/dashboard";

const MessageTypeDistribution = ({ data }: DashboardProps) => {
  const messageTypeData = data?.data?.charts?.messageTypeDistribution || [];
  const totalMessages = messageTypeData.reduce((sum, item) => sum + item.count, 0);
  const labels = messageTypeData.map(item => item.message_type.charAt(0).toUpperCase() + item.message_type.slice(1));
  const series = messageTypeData.map(item => item.count);

  const updatedOptions = {
    ...messageTypeDistributionOptions,
    labels: labels,
    series: series,
    plotOptions: {
      ...messageTypeDistributionOptions.plotOptions,
      pie: {
        ...messageTypeDistributionOptions.plotOptions?.pie,
        donut: {
          ...messageTypeDistributionOptions.plotOptions?.pie?.donut,
          labels: {
            ...messageTypeDistributionOptions.plotOptions?.pie?.donut?.labels,
            total: {
              ...messageTypeDistributionOptions.plotOptions?.pie?.donut?.labels?.total,
              formatter: () => totalMessages.toString(),
            },
          },
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Message Type Distribution</h5>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="monthly-profit">
          <div className="message-type-chart">
            <Chart options={updatedOptions} series={series} type="donut" height={300} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default MessageTypeDistribution;