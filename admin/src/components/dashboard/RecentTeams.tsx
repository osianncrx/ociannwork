import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader } from 'reactstrap'
import { queries } from '../../api'
import CommonTable from '../../shared/table'
import { Column, SingleTeam, TableConfig } from '../../types'
import { COLUMN_TYPE } from '../../types/constants'
import { useTableManager } from '../../utils/hooks/useTablemanager'
import { Avatar } from '../../shared/image'

const RecentTeams = () => {
  const { t } = useTranslation()
  const { params } = useTableManager()
  const { data, isRefetching, isLoading } = queries.useGetTeams(params)
  const recentTeams = data?.teams
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const columns: Column<SingleTeam>[] = [
    {
      title: t('name'),
      sortable: false,
      dataField: [
        {
          field: 'name',
        },
      ],
    },
    {
      title: 'members',
      sortable: false,
      dataField: [
        {
          field: 'total_members',
        },
      ],
    },
    {
      title: t('created_on'),
      sortable: false,
      sortField: 'created_at',
      dataField: [
        {
          field: 'created_at',
          type: COLUMN_TYPE.Date,
        },
      ],
    },
    {
      title: t('created_by'),
      sortable: false,
      sortField: 'created_by',
      dataField: [
        {
          field: 'created_by',
          renderer: (data) => (
            <div className="team-des">
              <Avatar data={data.created_by} name={data.created_by} customClass="user-img img-50" />
              <div className="user-data">
                <h5>{data?.created_by?.name}</h5>
              </div>
            </div>
          ),
        },
      ],
    },
  ]

  const config: TableConfig<SingleTeam> = {
    columns,
    data: recentTeams || [],
    total: data?.total,
    actionsDropDown: [],
  }

  return (
    <Card className="recent-teams-card">
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5 className="fw-semibold">Recent Teams</h5>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <CommonTable isLoading={isLoading} isRefetching={isRefetching} tableConfiguration={config} isCheckBox={false} />
      </CardBody>
    </Card>
  )
}

export default RecentTeams
