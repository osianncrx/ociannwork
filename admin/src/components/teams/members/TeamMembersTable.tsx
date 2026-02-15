import { Link, useParams } from 'react-router-dom'
import { mutations, queries } from '../../../api'
import { Avatar } from '../../../shared/image'
import CommonTable from '../../../shared/table'
import { Action, Column, SingleTeamMember, TableConfig } from '../../../types'
import { SolidButton } from '../../../shared/button/SolidButton'
import { useTranslation } from 'react-i18next'
import TableWrapper from '../../../utils/hoc/TableWrapper'
import { ConfirmModal } from '../../../shared/modal'
import { useTableManager } from '../../../utils/hooks/useTablemanager'
import { useState } from 'react'
import { toaster } from '../../../utils/custom-functions'
import { TeamRole } from '../../../types/constants'
import { ROUTES } from '../../../constants'
import SvgIcon from '../../../shared/icons/SvgIcon'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { startImpersonation as startImpersonationAction } from '../../../store/slices/authSlice'

const TeamMembersTable = () => {
  const { pagination: basePagination, search, params, sort } = useTableManager()
  const { teamId } = useParams<{ teamId: string }>()
  const { t } = useTranslation()
  const [tableKey, setTableKey] = useState(0)
  const [, setLoadingStates] = useState<Record<string, boolean>>({})
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

  if (!teamId) {
    console.error('team id is missing')
    return null
  }

  const { data, isLoading, refetch, isRefetching } = queries.useGetTeamMembers(params, teamId)
  const { mutateAsync: updateStatus } = mutations.useTeamStatusUpdate(teamId)
  const { mutate } = mutations.useDeleteTeamMember()
  const { mutate: startImpersonation, isPending: isImpersonating } = mutations.useStartImpersonation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((store) => store.auth)

  const pagination = {
    ...basePagination,
    total: data?.total || 0,
  }

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

  const columns: Column<SingleTeamMember>[] = [
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
                <div className="common-flex flex-between-start gap-1">
                  <h5>{data?.name}</h5>
                  {data.team_role === 'admin' && (
                    <button className="badge-outline-sm-primary" type="button">
                      {t('admin')}
                    </button>
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
  ]

  const actionsDropDown: (Action<SingleTeamMember> | string)[] = [
    {
      label: '',
      actionToPerform: 'toggleAdmin',
      renderer: (row: SingleTeamMember) => {
        if ((data?.members?.length || 0) <= 1) return null
        return (
          <SolidButton
            className={row.team_role === 'admin' ? 'btn-outline-danger' : 'btn-outline-success'}
            onClick={() =>
              handleActionPerform?.({
                actionToPerform: row.team_role === 'admin' ? 'disable_rights' : 'make_admin',
                data: row,
              })
            }
            title={row.team_role === 'admin' ? 'disable_rights' : 'make_admin'}
          />
        )
      },
    },
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
    // Show impersonate for super_admin and team admins (team admins can only impersonate members)
    {
      label: 'Impersonate',
      actionToPerform: 'impersonate',
      renderer: (row: SingleTeamMember) => {
        // Only show for super_admin or team admins
        if (user?.role !== 'super_admin' && user?.role !== 'admin') return null
        // Team admins can only impersonate members, not other admins
        if (user?.role === 'admin' && row.team_role === 'admin') return null
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
    },
    'delete',
  ]

  const handleActionPerform = async ({
    actionToPerform,
    data,
  }: {
    actionToPerform: string
    data: SingleTeamMember
  }) => {
    const rowId = data?.id
    const loadingKey = `${actionToPerform}-${rowId}`

    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))

      if (actionToPerform === 'delete') {
        const member = data
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('remove_user_title'),
          subtitle: `${t('remove_user_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            mutate(
              { teamId, ids: [member.id] },
              {
                onSuccess: () => {
                  toaster('success', t('user_deleted_successfully'))
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
        const member = data
        if (member.team_role !== 'admin') {
          toaster('error', t('not_an_admin'))
          return
        }
        showConfirmModal({
          variant: 'danger',
          title: t('remove_admin_rights_title'),
          iconId: 'remove-admin',
          subtitle: t('remove_admin_rights_description'),
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
        const member = data
        if (member.team_role === TeamRole.Admin) {
          toaster('error', t('already_an_admin'))
          return
        }
        showConfirmModal({
          variant: 'info',
          iconId: 'admin',
          confirmText: 'confirm',
          title: t('promote_to_admin_title'),
          subtitle: t('promote_to_admin_description'),
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

      if (actionToPerform === 'impersonate') {
        const member = data
        // Check permissions
        if (user?.role !== 'super_admin' && user?.role !== 'admin') {
          toaster('error', 'You do not have permission to impersonate users')
          return
        }

        // Team admins can only impersonate members, not other admins
        if (user?.role === 'admin' && member.team_role === 'admin') {
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
                  console.log('🚀 ~ handleActionPerform ~ response:', response)
                  if (response.success) {
                    toaster('success', 'Impersonation started successfully')
                    const userAppUrl = import.meta.env.VITE_FRONTEND_URL + `?token=${encodeURIComponent(response.token)}&personate-local=false`
                    console.log("🚀 ~ handleActionPerform ~ userAppUrl:", userAppUrl)
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

  const handleBulkActions = (action: string, selectedMembers: SingleTeamMember[]) => {
    if (action === 'delete' && selectedMembers.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_user_title'),
        subtitle: `${t('delete_multiple_users_description', { count: selectedMembers.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          mutate(
            { teamId, ids: selectedMembers.map((user) => user.id) },
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

  const config: TableConfig<SingleTeamMember> = {
    columns,
    data: data?.members || [],
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

export default TeamMembersTable
