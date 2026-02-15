import { Card, CardBody, CardHeader } from 'reactstrap'
import { queries } from '../../../api'
import { countryCodes } from '../../../data'
import { Avatar } from '../../../shared/image'
import CommonTable from '../../../shared/table'
import { Column, SingleTeam, TableConfig } from '../../../types'
import { useTableManager } from '../../../utils/hooks'

const RecentJoinedMember = () => {
  const { pagination, params } = useTableManager()
  const { data, isRefetching } = queries.useGetTeamMembersList({
    ...params,
    limit: 4,
    sort: 'created_at',
    order: 'desc',
  })

  const statusConfig: Record<SingleTeam['status'], { class: string; label: string }> = {
    active: { class: 'text-success', label: 'Active' },
    pending: { class: 'text-warning', label: 'Pending' },
    blocked: { class: 'text-danger', label: 'Blocked' },
    deactivated: { class: 'text-secondary', label: 'Deactivated' },
  }

  const columns: Column<SingleTeam>[] = [
    {
      title: 'name',
      sortable: false,
      sortField: 'name',
      dataField: [
        {
          field: 'name',
          renderer: (data) => (
            <div className="d-flex align-items-center gap-2">
              <Avatar data={data} name={data} customClass="user-img img-40" />
              <div className="text-start">
                <h6 className="mb-0">{data?.name}</h6>
                <small className="text-muted">{data?.email}</small>
              </div>
            </div>
          ),
        },
      ],
    },

    {
      title: 'status',
      sortable: false,
      sortField: 'status',
      dataField: [
        {
          field: 'status',
          renderer: (data) => {
            const config = statusConfig[data?.status] || statusConfig.active
            return <span className={`fw-semibold ${config.class}`}>{config.label}</span>
          },
        },
      ],
    },
    {
      title: 'country',
      sortable: false,
      sortField: 'country_code',
      dataField: [
        {
          field: 'country_code',
          renderer: (data) => {
            const countryCode = data?.country_code
              ? data.country_code.startsWith('+')
                ? data.country_code
                : `+${data.country_code}`
              : undefined
            const country = countryCodes.find((c) => c.code === countryCode)
            return (
              <div className="d-flex align-items-center gap-2">
                {country ? (
                  <>
                    <img src={country.flag} alt={country.name} className="rounded w-24" />
                    <span className="text-muted">{country.name}</span>
                  </>
                ) : (
                  <span className="text-muted">N/A</span>
                )}
              </div>
            )
          },
        },
      ],
    },
  ]

  const config: TableConfig<SingleTeam> = {
    columns,
    data: (data?.members || []).slice(0, 4),
    actionsDropDown: [],
    total: Math.min(data?.total || 0, 4),
  }

  pagination.total = Math.min(data?.total || 0, 4)

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Recent Joined Member</h5>
        </div>
      </CardHeader>
      <CardBody>
        <CommonTable
          className="recent-joined-table"
          isRefetching={isRefetching}
          hasChecks={false}
          tableConfiguration={config}
        />
      </CardBody>
    </Card>
  )
}

export default RecentJoinedMember
