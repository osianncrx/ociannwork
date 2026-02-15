import { useTranslation } from 'react-i18next'
import { mutations, queries } from '../../api'
import { ROUTES } from '../../constants'
import CommonTable from '../../shared/table'
import { Action, Column, SingleTeam, TableConfig } from '../../types'
import TableWrapper from '../../utils/hoc/TableWrapper'
import { useTableManager } from '../../utils/hooks/useTablemanager'
import { useState } from 'react'
import { ConfirmModal } from '../../shared/modal'
import { toaster } from '../../utils/custom-functions'
import { COLUMN_TYPE } from '../../types/constants'
import { Avatar } from '../../shared/image'

const TeamsTable = () => {
  const { pagination: basePagination, search, params, sort } = useTableManager()
  const { data, isLoading, refetch, isRefetching } = queries.useGetTeams(params)
  const { mutate } = mutations.useDeleteTeam()
  const { t } = useTranslation()
  const [, setLoadingStates] = useState<Record<string, boolean>>({})
  const [tableKey, setTableKey] = useState(0)
  
  const pagination = {
    ...basePagination,
    total: data?.total || 0,
  }

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    isLoading: false,
    onConfirm: () => {},
    title: '',
    subtitle: '',
    confirmText: 'confirm',
    variant: 'default' as 'default' | 'danger' | 'warning' | 'success' | 'info',
    iconId: '',
  })

  const showConfirmModal = (config: Partial<typeof confirmModal>) => {
    setConfirmModal((prev) => ({
      ...prev,
      isOpen: true,
      ...config,
    }))
  }

  const hideConfirmModal = () => {
    setConfirmModal((prev) => ({
      ...prev,
      isOpen: false,
      isLoading: false,
    }))
  }

  const columns: Column<SingleTeam>[] = [
    {
      title: 'name',
      sortable: true,
      sortField: 'name',
      dataField: [
        {
          field: 'name',
          renderer: (data) => (
            <div className="team-des">
              <Avatar data={data} name={data} customClass="user-img img-50" />
              <div className="user-data">
                <h5>{data?.name}</h5>
                <div className="users">
                  <ul>
                    <li>
                      <span>
                        {t('owner')}: {data?.created_by?.name}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      title: 'members',
      sortable: true,
      sortField: 'total_members',
      dataField: [
        {
          field: 'total_members',
        },
      ],
    },
    {
      title: 'created_at',
      sortable: true,
      sortField: 'created_at',
      dataField: [
        {
          type: COLUMN_TYPE.Date,
          field: 'created_at',
          dateformatOptions: { showDate: true, showTime: false },
        },
      ],
    },
  ]

  const actionsDropDown: (Action<SingleTeam> | string)[] = [
    {
      label: 'view',
      actionToPerform: 'view',
      viewConfig: {
        redirectUrl: (row) => ROUTES.MANAGE_TEAM_MEMBERS.replace(':teamId', row.id.toString()),
      },
    },
    'delete',
  ]

  const handleActionPerform = async ({
    actionToPerform,
    data,
  }: {
    actionToPerform: string
    data: (SingleTeam & { action: string; user_id?: string }) | { action: string; user_id?: string }
  }) => {
    const rowId = (data as SingleTeam)?.id
    const loadingKey = `${actionToPerform}-${rowId}-${data.action}`

    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))

      if (actionToPerform === 'delete') {
        const teamToDelete = data as SingleTeam

        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('delete_team_title'),
          subtitle: `${t('delete_team_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            mutate({ids: [teamToDelete.id]}, {
              onSuccess: () => {
                toaster('success', t('team_deleted_successfully'))
                hideConfirmModal()
                setTableKey(prev => prev + 1)
                refetch()
              },
              onError: (error) => {
                console.error('Delete error:', error)
                toaster('error', t('failed_to_delete_team'))
                setConfirmModal((prev) => ({ ...prev, isLoading: false }))
              },
            })
          },
        })
        return
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const handleBulkActions = (action: string, selectedTeams: SingleTeam[]) => {
    if (action === 'delete' && selectedTeams.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_team_title'),
        subtitle: `${t('delete_multiple_teams_description', { count: selectedTeams.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          mutate(
            { ids: selectedTeams.map(user => user.id) },
            {
              onSuccess: () => {
                toaster('success', t('teams_deleted_successfully', { count: selectedTeams.length }))
                hideConfirmModal()
                refetch()
              },
              onError: (error) => {
                console.error('Delete error:', error)
                toaster('error', t('failed_to_delete_team'))
                setConfirmModal((prev) => ({ ...prev, isLoading: false }))
              },
            }
          )
        },
      })
    }
  }

  const config: TableConfig<SingleTeam> = {
    columns,
    data: data?.teams || [],
    actionsDropDown,
    total: data?.total,
  }

  return (
    <>
      <TableWrapper pagination={pagination} search={search} handleBulkActions={handleBulkActions} showDelete={true}>
        <CommonTable
          key={tableKey}
          isLoading={isLoading}
          isRefetching={isRefetching}
          tableConfiguration={config}
          onActionPerform={handleActionPerform}
          sort={sort}
        />
      </TableWrapper>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={hideConfirmModal}
        onConfirm={confirmModal.onConfirm}
        isLoading={confirmModal.isLoading}
        variant={confirmModal.variant}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle}
        confirmText={confirmModal.confirmText}
        loadingText={t('processing')}
        iconId={confirmModal.iconId}
      />
    </>
  )
}

export default TeamsTable
