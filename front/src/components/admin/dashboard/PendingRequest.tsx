import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader } from 'reactstrap'
import { mutations, queries } from '../../../api'
import { SolidButton } from '../../../shared/button'
import { Avatar } from '../../../shared/image'
import CommonTable from '../../../shared/table'
import { Action, Column, SingleTeam, TableConfig } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import { useTableManager } from '../../../utils/hooks'
import { ColumnType } from '../../../constants'
import { SvgIcon } from '../../../shared/icons'

const PendingRequest = () => {
  const { pagination, params } = useTableManager()
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const { t } = useTranslation()

  const { data, refetch, isRefetching } = queries.useGetTeamMembersList({
    ...params,
    status: 'pending',
    limit: 4,
  })
  const { mutateAsync: updateStatus } = mutations.useTeamStatusUpdate()

  const columns: Column<SingleTeam>[] = [
    {
      title: t('name'),
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
      title: t('date'),
      sortable: false,
      sortField: 'created_at',
      dataField: [
        {
          field: 'created_at',
          type: ColumnType.Date,
        },
      ],
    },
  ]

  const actionsDropDown: Action<SingleTeam>[] = [
    {
      label: 'accept',
      renderer: (row) => (
        <SolidButton
          title="Accept"
          className="btn-sm btn-outline-success"
          onClick={() => handleAction(row.id, 'approve')}
          loading={loadingStates[`approve-${row.id}`]}
          disabled={loadingStates[`approve-${row.id}`] || loadingStates[`reject-${row.id}`]}
        />
      ),
    },
    {
      label: 'reject',
      renderer: (row) => (
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => handleAction(row.id, 'reject')}
          disabled={loadingStates[`approve-${row.id}`] || loadingStates[`reject-${row.id}`]}
        >
          <SvgIcon iconId="close-icon" className="common-svg-hw" />
        </button>
      ),
    },
  ]

  const handleAction = async (userId: number, action: 'approve' | 'reject') => {
    const loadingKey = `${action}-${userId}`

    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))
      await updateStatus(
        { user_id: userId, action },
        {
          onSuccess: () => {
            toaster(
              'success',
              action === 'approve' ? t('request_approved_successfully') : t('request_rejected_successfully'),
            )
            refetch()
          },
          onError: () => {
            toaster('error', t('something_went_wrong'))
          },
        },
      )
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const config: TableConfig<SingleTeam> = {
    columns,
    data: data?.members || [],
    actionsDropDown,
    total: data?.total,
  }

  pagination.total = data?.total || 0

  return (
    <Card>
      <CardHeader className="card-no-border">
        <div className="header-top">
          <h5>Pending Request</h5>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <CommonTable
          hasChecks={false}
          className="pending-request-table custom-scrollbar"
          isRefetching={isRefetching}
          tableConfiguration={config}
        />
      </CardBody>
    </Card>
  )
}

export default PendingRequest
