import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mutations, queries } from '../../../api'
import { STORAGE_KEYS, TeamRole } from '../../../constants'
import { SolidButton } from '../../../shared/button'
import { Avatar } from '../../../shared/image'
import { ConfirmModal } from '../../../shared/modal'
import TabHeader from '../../../shared/tab/TabHeader'
import CommonTable from '../../../shared/table'
import { Action, Column, SingleTeam, TableConfig } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import TableWrapper from '../../../utils/hoc/TableWrapper'
import { useTableManager } from '../../../utils/hooks'
import InviteTeamMemberForm from './InviteTeamMemberForm'
import { ColumnType } from '../../../constants'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { startImpersonation as startImpersonationAction } from '../../../store/slices/authSlice'
import SvgIcon from '../../../shared/icons/SvgIcon'
import { getStorage } from '../../../utils'

const TeamsTable = () => {
  const { pagination, search, params, sort } = useTableManager()
  const [tabFilters, setTabFilters] = useState({ role: '', status: '' })
  const [tabCounts, setTabCounts] = useState({
    total: 0,
    admins: 0,
    pending: 0,
    deactivated: 0,
  })

  const [tableKey, setTableKey] = useState(0)
  const [activeTab, setActiveTab] = useState('1')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [isInviteModalOpen, setInviteModalOpen] = useState(false)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)
  const { data: userDetails } = queries.useGetUserDetails()
  const { data, refetch, isRefetching } = queries.useGetTeamMembersList({ ...params, ...tabFilters })
  const { mutateAsync: updateStatus } = mutations.useTeamStatusUpdate()
  const { mutate: deleteTeamMember } = mutations.useDeleteTeamMember()
  const { mutate: startImpersonation, isPending: isImpersonating } = mutations.useStartImpersonation()

  // Check if current user is team admin or super_admin
  const isTeamAdmin = userDetails?.member?.role === TeamRole.Admin || user?.role === 'super_admin'

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

  const tabItems = [
    { id: '1', label: 'all_team', count: Math.max(tabCounts?.total - tabCounts?.pending, 0) ?? 0 },
    { id: '2', label: 'admins', count: tabCounts?.admins ?? 0 },
    { id: '3', label: 'pending_requests', count: tabCounts?.pending ?? 0 },
    { id: '4', label: 'deactivated', count: tabCounts?.deactivated ?? 0 },
  ]

  const baseColumns: Column<SingleTeam>[] = [
    {
      title: t('name'),
      sortable: true,
      sortField: 'name',
      dataField: [
        {
          field: 'name',
          renderer: (data) => (
            <div className="team-des">
              <Avatar data={data} name={data} customClass="user-img img-50" />
              <div className="user-data">
                <div className="common-flex flex-between-start gap-1">
                  <h5>{data?.name}</h5>
                  {data.team_role === TeamRole.Admin && (
                    <button className="badge-outline-sm-primary">{t('admin')}</button>
                  )}
                </div>
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
      title: t('display_name'),
      sortable: true,
      sortField: 'display_name',
      dataField: [
        {
          field: 'display_name',
        },
      ],
    },
    {
      title: t('created_at'),
      sortable: true,
      sortField: 'created_at',
      dataField: [
        {
          field: 'created_at',
          type: ColumnType.Date,
        },
      ],
    },
  ]

  const statusColumn: Column<SingleTeam> = {
    title: t('status'),
    dataField: [
      {
        field: 'status' as keyof SingleTeam,
        type: ColumnType.StatusSwitch,
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
      },
    ],
  }

  const actionsDropDown: (Action<SingleTeam> | string)[] =
    activeTab === '3'
      ? [
          {
            label: 'approve',
            renderer: (row) => {
              return (
                <SolidButton
                  title="approve"
                  className="btn-outline-success"
                  onClick={() => {
                    showConfirmModal({
                      variant: 'info',
                      iconId: 'confirmation',
                      title: t('approve_member_title'),
                      subtitle: `${t('approve_member_description')}`,
                      confirmText: t('approve'),
                      onConfirm: async () => {
                        setConfirmModal((prev) => ({ ...prev, isLoading: true }))
                        await handleActionPerform?.({
                          actionToPerform: 'request',
                          data: { user_id: row?.id, action: 'approve' },
                        })
                        hideConfirmModal()
                      },
                    })
                  }}
                  loading={loadingStates[`request-${row.id}-approve`]}
                  disabled={loadingStates[`request-${row.id}-approve`]}
                />
              )
            },
          },
          {
            label: 'reject',
            renderer: (row) => (
              <SolidButton
                title="reject"
                className="btn-outline-danger"
                onClick={() =>
                  handleActionPerform?.({
                    actionToPerform: 'request',
                    data: { user_id: row?.id, action: 'reject' },
                  })
                }
                loading={loadingStates[`request-${row.id}-reject`]}
                disabled={loadingStates[`request-${row.id}-reject`]}
              />
            ),
          },
        ]
      : [
          'make_admin',
          {
            label: 'Impersonate',
            actionToPerform: 'impersonate',
            renderer: (row: SingleTeam) => {
              // Team admins can only impersonate members, not other admins
              if (user?.role !== 'super_admin' && row.team_role === TeamRole.Admin) return null
              // Don't show for self
              if (row.id === user?.id) return null
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
          } as Action<SingleTeam>,
          'delete',
        ]

  const handleActionPerform = async ({
    actionToPerform,
    data,
  }: {
    actionToPerform: string
    data: SingleTeam | (SingleTeam & { action: string; user_id?: string }) | { action: string; user_id?: string }
  }) => {
    const rowId = (data as SingleTeam)?.id
    const loadingKey = `${actionToPerform}-${rowId}`

    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))

      if (actionToPerform === 'delete') {
        const member = data as SingleTeam
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('delete_member_title'),
          subtitle: `${t('delete_member_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            deleteTeamMember(
              { ids: [member.id] },
              {
                onSuccess: () => {
                  toaster('success', t('member_deleted_successfully'))
                  hideConfirmModal()
                  setTableKey((prev) => prev + 1)
                  refetch()
                },
                onError: () => {
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      }

      if (actionToPerform === 'disable_rights') {
        const member = data as SingleTeam
        if (member.team_role !== 'admin') {
          toaster('error', t('not_an_admin'))
          return
        }
        showConfirmModal({
          variant: 'danger',
          title: t('remove_admin_rights_title'),
          iconId: 'remove-admin',
          subtitle: `${t('remove_admin_rights_description')} ${member.name}?`,
          confirmText: t('remove'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            await updateStatus(
              { user_id: member.id, action: 'remove_admin' },
              {
                onSuccess: () => {
                  toaster('success', t('admin_rights_removed_successfully'))
                  hideConfirmModal()
                  refetch()
                },
                onError: () => {
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      }

      if (actionToPerform === 'make_admin') {
        const member = data as SingleTeam
        if (member.team_role === TeamRole.Admin) {
          toaster('error', t('already_an_admin'))
          return
        }
        showConfirmModal({
          variant: 'info',
          iconId: 'admin',
          confirmText: 'confirm',
          title: t('promote_to_admin_title'),
          subtitle: `${t('promote_to_admin_description')} ${member.name}`,
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            await updateStatus(
              { user_id: member.id, action: 'make_admin' },
              {
                onSuccess: () => {
                  toaster('success', t('admin_promoted_successfully'))
                  hideConfirmModal()
                  refetch()
                },
                onError: () => {
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      }

      if (actionToPerform === 'status') {
        const { id, action } = data as SingleTeam & { action: string }
        await updateStatus(
          { user_id: id, action },
          {
            onSuccess: () => {
              setTabCounts((prev) => {
                const updated = { ...prev }
                if (action === 'deactivate') {
                  updated.deactivated += 1
                }
                if (action === 'reactivate') {
                  updated.deactivated -= 1
                }
                return updated
              })
              toaster('success', 'User status updated successfully')
            },
          },
        )
      }

      if (actionToPerform === 'request') {
        const { user_id, action } = data as SingleTeam & { action: string }
        await updateStatus(
          { user_id: user_id, action },
          {
            onSuccess: () => {
              setTabCounts((prev) => {
                const updated = { ...prev }
                if (action === 'approve') {
                  updated.pending -= 1
                  updated.total += 1
                }
                if (action === 'reject') {
                  updated.pending -= 1
                }
                return updated
              })
              toaster('success', 'User status updated successfully')
              refetch()
            },
          },
        )
      }

      if (actionToPerform === 'impersonate') {
        const member = data as SingleTeam
        // Check permissions
        if (!isTeamAdmin) {
          toaster('error', 'You do not have permission to impersonate users')
          return
        }

        if (user?.role !== 'super_admin' && member.team_role === TeamRole.Admin) {
          toaster('error', 'Team admins can only impersonate team members, not other admins')
          return
        }

        // Don't allow impersonating yourself
        if (member.id === user?.id) {
          toaster('error', 'You cannot impersonate yourself')
          return
        }

        showConfirmModal({
          variant: 'warning',
          iconId: 'user',
          title: 'Impersonate User',
          subtitle: `Are you sure you want to impersonate ${member.name} (${member.email})? You will be logged in as this user.`,
          confirmText: 'Impersonate',
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            startImpersonation(
              { targetUserId: member.id },
              {
                onSuccess: (response) => {
                  if (response.success) {
                    const storage = getStorage()
                    dispatch(
                      startImpersonationAction({
                        token: response.token,
                        targetUser: response.targetUser,
                        impersonator: response.impersonator,
                        targetRole: response.targetRole, // Pass the target role
                      }),
                    )
                    storage.setItem(STORAGE_KEYS.PERSONATING_LOCAL, true)
                    toaster('success', 'Impersonation started successfully')
                    hideConfirmModal()

                    // If impersonating a member, navigate to chat page instead of admin route
                    // The router will automatically show the correct interface based on the updated role in storage
                    if (response.targetRole === 'member' || response.targetRole === TeamRole.Member) {
                      // Set the screen to webScreen so the chat interface is shown
                      storage.setItem('currentScreen', 'webScreen')
                      // Update team member role in storage to reflect the impersonated user's role
                      storage.setItem('teamMemberRole', response.targetRole)
                      // Navigate to root path which will show the chat interface for non-admin users
                      window.location.href = '/'
                    } else {
                      // For admins, reload to stay on admin route
                      window.location.reload()
                    }
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

  const handleBulkActions = (action: string, selectedMembers: SingleTeam[]) => {
    if (action === 'delete' && selectedMembers.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_user_title'),
        subtitle: `${t('delete_multiple_users_description', { count: selectedMembers.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          deleteTeamMember(
            { ids: selectedMembers.map((user) => user.id) },
            {
              onSuccess: () => {
                toaster('success', t('users_deleted_successfully', { count: selectedMembers.length }))
                hideConfirmModal()
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
    }
  }

  useEffect(() => {
    switch (activeTab) {
      case '1':
        setTabFilters({ status: 'active', role: '' })
        break
      case '2':
        setTabFilters({ status: '', role: 'admin' })
        break
      case '3':
        setTabFilters({ role: '', status: 'pending' })
        break
      case '4':
        setTabFilters({ role: '', status: 'deactivated' })
        break
      default:
        setTabFilters({ role: '', status: '' })
        break
    }
  }, [activeTab])

  const activeTabItem = tabItems.find((tab) => tab.id === activeTab)
  const isPendingRequestsTab = activeTabItem?.label === 'pending_requests'

  const columns: Column<SingleTeam>[] = !isPendingRequestsTab ? [...baseColumns, statusColumn] : baseColumns

  const config: TableConfig<SingleTeam> = {
    columns,
    data: data?.members || [],
    actionsDropDown,
    total: data?.total,
  }

  useEffect(() => {
    if (data?.counts) {
      setTabCounts((prev) => ({
        ...prev,
        admins: data.counts.admins ?? prev.admins,
        pending: data.counts.pending ?? prev.pending,
        deactivated: data.counts.deactivated ?? prev.deactivated,
        total: data.counts.total ?? prev.total,
      }))
    }
  }, [data?.counts])

  pagination.total = data?.total || 0

  return (
    <>
      <TabHeader vertical={false} activeId={activeTab} setActiveId={setActiveTab} tabs={tabItems} />
      <TableWrapper
        pagination={pagination}
        search={search}
        handleBulkActions={handleBulkActions}
        activeTab={activeTab}
        showDelete={true}
      >
        <CommonTable
          key={tableKey}
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

      <InviteTeamMemberForm isOpen={isInviteModalOpen} toggle={() => setInviteModalOpen(false)} />
    </>
  )
}

export default TeamsTable
