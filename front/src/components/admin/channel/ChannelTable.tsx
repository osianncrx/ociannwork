import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations, queries } from '../../../api'
import { Avatar } from '../../../shared/image'
import { ConfirmModal } from '../../../shared/modal'
import CommonTable from '../../../shared/table'
import { Action, Channel, Column, SingleCustomField, TableConfig } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import TableWrapper from '../../../utils/hoc/TableWrapper'
import { useTableManager } from '../../../utils/hooks'
import { ColumnType } from '../../../constants'

const ChannelTable = () => {
  const { pagination, search, params, sort } = useTableManager()
  const { t } = useTranslation()
  const { data, refetch, isRefetching, isLoading } = queries.useGetChannelsByTeam({ ...params })
  const { mutate: deleteChannel } = mutations.useDeleteChannel()
  const [tableKey, setTableKey] = useState(0)
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

  const columns: Column<SingleCustomField>[] = [
    {
      title: t('name'),
      sortable: true,
      sortField: 'name',
      dataField: [
        {
          field: 'name',
          renderer: (data) => (
            <div className="team-des">
              <Avatar data={data} name={data} channel={true} customClass="user-img img-50" />
              <div className="user-data">
                <div className="common-flex flex-between-start gap-1">
                  <h5>{data?.name}</h5>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      title: t('created_by'),
      sortable: true,
      sortField: 'name',
      dataField: [
        {
          field: 'created_by',
          renderer: (data) => (
            <div className="team-des">
              <Avatar data={data?.creator} name={data?.creator} customClass="user-img img-50" />
              <div className="user-data">
                <div className="common-flex flex-between-start gap-1">
                  <h5>{data?.creator?.name}</h5>
                </div>
                <div className="users">
                  <ul>
                    <li>
                      <span>{data?.creator?.email}</span>
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
      title: t('created_at'),
      dataField: [
        {
          field: 'created_at',
          type: ColumnType.Date,
        },
      ],
    },
  ]

  const actionsDropDown: (Action<Channel> | string)[] = [
    {
      label: 'view',
      getNavigateUrl: (data) => {
        return `/manage-channel/${data.id}`
      },
    },
    'delete',
  ]

  const handleActionPerform = async ({ actionToPerform, data }: {
    actionToPerform: string
    data: (Channel & { action: string; user_id?: string }) | { action: string; user_id?: string }
  }) => {
    try {
      if (actionToPerform === 'delete') {
        const member = data as Channel
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('delete_channel_title'),
          subtitle: `${t('delete_channel_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            deleteChannel(
              { ids: [member.id] },
              {
                onSuccess: () => {
                  toaster('success', t('channel_deleted_successfully'))
                  hideConfirmModal()
                  setTableKey((prev) => prev + 1)
                  refetch()
                },
                onError: () => {
                  toaster('error', t('failed_to_delete_channel'))
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      }
    } catch (error) {
      throw error
    }
  }

  const handleBulkActions = (action: string, selectedChannels: Channel[]) => {
    if (action === 'delete' && selectedChannels.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_channel_title'),
        subtitle: `${t('delete_multiple_channels_description', { count: selectedChannels.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          deleteChannel(
            { ids: selectedChannels.map((user) => user.id) },
            {
              onSuccess: () => {
                toaster('success', t('channel_deleted_successfully', { count: selectedChannels.length }))
                hideConfirmModal()
                refetch()
              },
              onError: (error) => {
                console.error('Delete error:', error)
                toaster('error', t('failed_to_delete_channel'))
                setConfirmModal((prev) => ({ ...prev, isLoading: false }))
              },
            },
          )
        },
      })
    }
  }

  const config: TableConfig<SingleCustomField> = {
    columns,
    data: data?.channels || [],
    actionsDropDown,
    total: data?.total,
  }

  pagination.total = data?.total || 0

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

export default ChannelTable
