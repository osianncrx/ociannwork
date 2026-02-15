import { Card, CardBody, CardHeader } from 'reactstrap'
import { Avatar } from '../../../shared/image'
import CommonTable from '../../../shared/table'
import { Column, TableConfig } from '../../../types'
import { useTableManager } from '../../../utils/hooks'
import { DashboardProps, InviteMember } from '../../../types/components/dashboard'
import { ColumnType } from '../../../constants'

const InvitedMembers = ({ data }: DashboardProps) => {
  const { pagination } = useTableManager()
  const newData: InviteMember[] =
    data?.data?.insights?.latestInvites?.map((member) => ({
      ...member,
      ...member.User,
    })) || []

  const statusConfig: Record<string, { class: string; label: string }> = {
    active: { class: 'text-success', label: 'Active' },
    pending: { class: 'text-warning', label: 'Pending' },
    blocked: { class: 'text-danger', label: 'Blocked' },
    deactivated: { class: 'text-secondary', label: 'Deactivated' },
  }

  const columns: Column<InviteMember>[] = [
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
      title: 'date',
      sortable: false,
      sortField: 'created_at',
      dataField: [
        {
          field: 'created_at',
          type: ColumnType.Date,
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
  ]

  const config: TableConfig<InviteMember> = {
    columns,
    data: newData,
    actionsDropDown: [],
    total: newData.length,
  }

  pagination.total = newData.length

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Invited Members</h5>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <CommonTable className="invited-members-table custom-scrollbar" tableConfiguration={config} hasChecks={false} />
      </CardBody>
    </Card>
  )
}

export default InvitedMembers
