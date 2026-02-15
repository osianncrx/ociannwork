import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, Col } from 'reactstrap'
import CommonTable from '../../shared/table'
import { Column, MostActiveUser, TableConfig } from '../../types'
import { Avatar } from '../../shared/image'
import { formatDate } from '../../utils'
import { MostActiveUsersProps } from '../../types/components/dashboard'

const MostActiveUsers: React.FC<MostActiveUsersProps> = ({ data }) => {
  const { t } = useTranslation()

  const columns: Column<MostActiveUser>[] = [
    {
      title: 'name',
      sortable: false,
      dataField: [
        {
          field: 'sender',
          renderer: (data) => (
            <div className="team-des">
              <Avatar data={data.sender} name={data.sender} customClass="user-img img-50" />
              <div className="user-data">
                <h5>{data?.sender?.name}</h5>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      title: t('messages_send'),
      sortable: false,
      dataField: [
        {
          field: 'message_count',
        },
      ],
    },
    {
      title: t('last_active'),
      sortable: false,
      dataField: [
        {
          field: 'sender',
          renderer: (data) => (
            <div className="team-des">
              <p>{formatDate(data?.sender?.last_seen) || 'N/A'}</p>
            </div>
          ),
        },
      ],
    },
  ]

  const config: TableConfig<MostActiveUser> = {
    columns,
    data: data.slice(0, 4) || [],
    total: 0,
    actionsDropDown: [],
  }

  return (
    <Col>
      <Card className="active-users-card">
        <CardHeader className="card-no-border">
          <div className="header-top">
            <h5 className="fw-semibold">Most Active Users</h5>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <CommonTable tableConfiguration={config} isCheckBox={false} />
        </CardBody>
      </Card>
    </Col>
  )
}

export default MostActiveUsers
