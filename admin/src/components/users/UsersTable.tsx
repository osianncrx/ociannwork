import Cookies from 'js-cookie'
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
import { useAppSelector } from '../../store/hooks'
import { Action, Column, SingleUser, TableConfig } from '../../types'
import { COLUMN_TYPE } from '../../types/constants'
import { toaster } from '../../utils/custom-functions'
import TableWrapper from '../../utils/hoc/TableWrapper'
import { useTableManager } from '../../utils/hooks/useTablemanager'
import AvatarList from '../widgets/AvatarList'

const UsersTable = () => {
  const { pagination: basePagination, search, params, sort } = useTableManager()
  const { data, isLoading, refetch, isRefetching } = queries.useGetUsers(params)
  const { mutate } = mutations.useDeleteUser()
  const { mutate: updateUserStatus } = mutations.useUpdateUserStatus()
  const { mutate: startImpersonation, isPending: isImpersonating } = mutations.useStartImpersonation()
  const { user } = useAppSelector((store) => store.auth)
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

  const columns: Column<SingleUser>[] = [
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
                      <span>{data?.email}</span>
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
      title: 'teams',
      sortable: false,
      dataField: [
        {
          field: 'Teams',
          renderer: (data) => (
            <div className="customers d-inline-block avatar-group">
              <ul className="avatar-list">
                {data?.Teams?.length ? (
                  <AvatarList data={data.Teams} />
                ) : (
                  <li className="d-inline-block">
                    <p>N/A</p>
                  </li>
                )}
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      title: 'Status',
      dataField: [
        {
          field: 'status',
          type: COLUMN_TYPE.StatusSwitch,
          formatOptions: {
            statusSwitch: {
              actionMap: {
                deactivate: 'deactivate',
                activate: 'reactivate',
              },
              activeValue: 'active',
              inactiveValue: 'deactivated',
            },
          },
          checkCondition: (val) => val === 'active',
          onToggle: (row) =>
            handleActionPerform({
              actionToPerform: 'status',
              data: row,
            }),
        },
      ],
    },
  ]

  const actionsDropDown: (Action<SingleUser> | string)[] = [
    {
      label: 'Manage',
      actionToPerform: 'edit',
      renderer: (row) => {
        return (
          <Link to={ROUTES.EDIT_USERS} state={{ userData: row }}>
            <SolidButton className="btn-bg-secondary">
              <SvgIcon className="common-svg-hw" iconId="table-edit" />
            </SolidButton>
          </Link>
        )
      },
    },
    // Only show impersonate for super_admin and if user is not themselves
    ...(user?.role === 'super_admin'
      ? [
          {
            label: 'Impersonate',
            actionToPerform: 'impersonate',
            renderer: (row) => {
              if (row.id === user?.id) return null // Don't show for self
              return (
                <SolidButton
                  className="btn-outline-warning"
                  onClick={() =>
                    handleActionPerform({
                      actionToPerform: 'impersonate',
                      data: row,
                    })
                  }
                  disabled={isImpersonating}
                  title="Impersonate User"
                >
                  <SvgIcon className="common-svg-hw" iconId="user" />
                </SolidButton>
              )
            },
          } as Action<SingleUser>,
        ]
      : []),
    'delete',
  ]

  const handleActionPerform = async ({ actionToPerform, data }: { actionToPerform: string; data: SingleUser }) => {
    const loadingKey = `${actionToPerform}-${data.id}`

    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))

      if (actionToPerform === 'delete') {
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('delete_user_title'),
          subtitle: `${t('delete_user_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            mutate(
              { ids: [data.id] },
              {
                onSuccess: () => {
                  toaster('success', t('user_deleted_successfully'))
                  hideConfirmModal()
                  setTableKey((prev) => prev + 1)
                  refetch()
                },
                onError: (error) => {
                  console.error('Delete error:', error)
                  toaster('error', t('failed_to_delete_user'))
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      } else if (actionToPerform === 'status') {
        const newStatus = data.status === 'active' ? 'deactive' : 'active'
        updateUserStatus(
          { id: data.id, status: newStatus },
          {
            onSuccess: () => {
              toaster('success', t('user_status_updated'))
              refetch()
            },
            onError: () => {
              toaster('error', t('failed_to_update_status'))
            },
          },
        )
      } else if (actionToPerform === 'impersonate') {
        // Check if user can impersonate (super_admin only)
        if (user?.role !== 'super_admin') {
          toaster('error', 'You do not have permission to impersonate users')
          return
        }

        // Don't allow impersonating yourself
        if (data.id === user?.id) {
          toaster('error', 'You cannot impersonate yourself')
          return
        }

        showConfirmModal({
          variant: 'warning',
          iconId: 'user',
          title: 'Impersonate User',
          subtitle: `Are you sure you want to impersonate ${data.name} (${data.email})? You will be logged in as this user.`,
          confirmText: 'Impersonate',
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            startImpersonation(
              { targetUserId: data.id },
              {
                onSuccess: (response) => {
                  if (response.success) {
                    toaster('success', 'Impersonation started successfully')
                    const teamId = data.Teams?.[0]?.id ? `&team-id=${data.Teams[0].id}` : ''
                    const userAppUrl =
                      import.meta.env.VITE_FRONTEND_URL +
                      `?token=${encodeURIComponent(response.token)}&personate-local=false${teamId}`
                    window.location.href = userAppUrl
                    hideConfirmModal()
                  }
                },
                onError: (error: any) => {
                  console.error('Impersonation error:', error)
                  toaster('error', error?.message || 'Failed to start impersonation')
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

  const handleBulkActions = (action: string, selectedUsers: SingleUser[]) => {
    if (action === 'delete' && selectedUsers.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_users_title'),
        subtitle: `${t('delete_multiple_users_description', { count: selectedUsers.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          mutate(
            { ids: selectedUsers.map((user) => user.id) },
            {
              onSuccess: () => {
                toaster('success', t('users_deleted_successfully', { count: selectedUsers.length }))
                hideConfirmModal()
                refetch()
              },
              onError: (error) => {
                console.error('Delete error:', error)
                toaster('error', t('failed_to_delete_users'))
                setConfirmModal((prev) => ({ ...prev, isLoading: false }))
              },
            },
          )
        },
      })
    }
  }

  const config: TableConfig<SingleUser> = {
    columns,
    data: data?.users || [],
    actionsDropDown,
    total: data?.total,
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

export default UsersTable
