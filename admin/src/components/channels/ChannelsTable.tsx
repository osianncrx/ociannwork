import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { mutations, queries } from '../../api'
import { ROUTES } from '../../constants'
import { SolidButton } from '../../shared/button/SolidButton'
import SvgIcon from '../../shared/icons/SvgIcon'
import { Avatar } from '../../shared/image'
import { ConfirmModal } from '../../shared/modal'
import CommonTable from '../../shared/table'
import { Action, Column, SingleChannel, TableConfig } from '../../types'
import { toaster } from '../../utils/custom-functions'
import TableWrapper from '../../utils/hoc/TableWrapper'
import { useTableManager } from '../../utils/hooks/useTablemanager'
import AvatarList from '../widgets/AvatarList'

const Channels = () => {
  const { pagination: basePagination, search, params, sort } = useTableManager()
  const { data, isLoading, refetch, isRefetching } = queries.useGetChannels(params)
  const { mutate } = mutations.useDeleteChannel()
  const [, setLoadingStates] = useState<Record<string, boolean>>({})
  const [tableKey, setTableKey] = useState(0)
  const { t } = useTranslation()

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

  const columns: Column<SingleChannel>[] = [
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
              </div>
            </div>
          ),
        },
      ],
    },
    {
      title: 'team',
      sortable: false,
      dataField: [
        {
          field: 'team',
          renderer: (data) => (
            <div className="customers d-inline-block avatar-group">
              <ul className="avatar-list">
                <AvatarList data={data?.team ? [data.team] : []} />
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      title: 'created_by',
      sortable: false,
      sortField: 'created_by',
      dataField: [
        {
          field: 'created_by',
          renderer: (data) => {
            if (!data?.created_by) {
              return (
                <div className="team-des">
                  <div className="user-data">
                    <h5 className="text-muted">N/A</h5>
                  </div>
                </div>
              )
            }

            return (
              <div className="team-des">
                <Avatar data={data.created_by} name={data.created_by} customClass="user-img img-50" />
                <div className="user-data">
                  <h5>{data.created_by.name || 'Unknown'}</h5>
                  <div className="users">
                    <ul>
                      <li>
                        <span>{data.created_by.email || ''}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )
          },
        },
      ],
    },
  ]

  const actionsDropDown: (Action<SingleChannel> | string)[] = [
    {
      label: 'Manage',
      actionToPerform: 'edit',
      renderer: (row) => {
        return (
          <Link to={`${ROUTES.EDIT_CHANNELS}`} state={{ channelData: row }}>
            <SolidButton className="btn-bg-secondary">
              <SvgIcon className="common-svg-hw" iconId="table-edit" />
            </SolidButton>
          </Link>
        )
      },
    },
    'delete',
  ]

  const config: TableConfig<SingleChannel> = {
    columns,
    data: data?.channels || [],
    actionsDropDown,
    total: data?.total,
  }

  pagination.total = data?.total || 0

  const handleActionPerform = async ({ actionToPerform, data }: { actionToPerform: string; data: SingleChannel }) => {
    const loadingKey = `${actionToPerform}-${data.id}`
    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))
      if (actionToPerform === 'delete') {
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('delete_channel_title'),
          subtitle: `${t('delete_channel_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            mutate(
              { ids: [data.id] },
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
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const handleBulkActions = (action: string, selectedChannels: SingleChannel[]) => {
    if (action === 'delete' && selectedChannels.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_channel_title'),
        subtitle: `${t('delete_multiple_channels_description', { count: selectedChannels.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          mutate(
            { ids: selectedChannels.map((user) => user.id) },
            {
              onSuccess: () => {
                toaster('success', t('channel_deleted_successfully', { count: selectedChannels.length }))
                hideConfirmModal()
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
    }
  }

  return (
    <>
      <TableWrapper pagination={pagination} search={search} showDelete={true} handleBulkActions={handleBulkActions}>
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

export default Channels