import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Col, Container, Row } from 'reactstrap'
import { mutations, queries } from '../../../api'
import { ColumnType } from '../../../constants'
import { CardWrapper } from '../../../shared/card'
import { SvgIcon } from '../../../shared/icons'
import { Avatar } from '../../../shared/image'
import { ConfirmModal, SimpleModal } from '../../../shared/modal'
import CommonTable from '../../../shared/table'
import { Action, Column, SingleCustomField, TableConfig } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import TableWrapper from '../../../utils/hoc/TableWrapper'
import { useTableManager } from '../../../utils/hooks'
import AddChannelMember from '../../web/chat/modals/AddChannelMember'

const ChannelMembers = () => {
  const { id } = useParams<{ id: string }>()
  const { pagination: basePagination, search, params, sort } = useTableManager()

  if (!id) {
    console.error('channel id is missing')
    return null
  }

  const { data, refetch, isRefetching, isLoading } = queries.useGetChannelMembers(
    { ...params, channel_id: id },
    { enabled: !!id },
  )
  const { t } = useTranslation()
  const [tableKey, setTableKey] = useState(0)
  const { mutate: updateRoleMutate } = mutations.useUpdateChannelMemberRole()
  const { mutate: deleteChannelMember } = mutations.useRemoveMemberFromChannel()
  const [addMembersModal, setAddMembersModal] = useState(false)
  const { mutate: addMembersToChannelMutate, isPending: isAddingMembers } = mutations.useAddMembersToChannel()

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

  const columns: Column<SingleCustomField>[] = [
    {
      title: t('name'),
      sortable: true,
      sortField: 'name',
      dataField: [
        {
          field: 'name',
          renderer: (data) => {
            return (
              <div className="team-des">
                <Avatar data={data.user} name={data.user} customClass="user-img img-50" />
                <div className="user-data">
                  <div className="common-flex flex-between-start gap-1">
                    <h5>{data?.user?.name}</h5>
                    {data?.role === 'admin' && <button className="badge-outline-sm-primary">{t('admin')}</button>}
                  </div>
                  <div className="users">
                    <ul>
                      <li>
                        <span>{data?.user?.email}</span>
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
    {
      title: t('joined_at'),
      dataField: [
        {
          field: 'joined_at',
          type: ColumnType.Date,
        },
      ],
    },
  ]

  const actionsDropDown: (Action<SingleCustomField> | string)[] = ['make_admin', 'delete']

  const handleActionPerform = async ({
    actionToPerform,
    data,
  }: {
    actionToPerform: string
    data: SingleCustomField
  }) => {
    try {
      if (actionToPerform === 'delete') {
        if (!data.user) {
          toaster('error', t('user_data_missing'))
          return
        }
        const user = data.user
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: t('delete_member_title'),
          subtitle: `${t('delete_member_description')}`,
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            deleteChannelMember(
              { channel_id: id, user_id: user.id.toString() },
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

      if (actionToPerform === 'make_admin') {
        if (!data.user) {
          toaster('error', t('user_data_missing'))
          return
        }

        if (data.role === 'admin') {
          toaster('error', t('already_an_admin'))
          return
        }

        showConfirmModal({
          variant: 'info',
          iconId: 'admin',
          confirmText: 'confirm',
          title: t('promote_to_admin_title'),
          subtitle: `${t('promote_to_admin_description')} ${data.user.name}`,
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            updateRoleMutate(
              {
                channel_id: id,
                user_id: data?.user?.id.toString(),
                new_role: 'admin',
              },
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

      if (actionToPerform === 'disable_rights') {
        if (!data.user) {
          toaster('error', t('user_data_missing'))
          return
        }

        if (data.role !== 'admin') {
          toaster('error', t('user_not_admin'))
          return
        }

        showConfirmModal({
          variant: 'warning',
          iconId: 'admin',
          confirmText: 'confirm',
          title: t('demote_admin_title'),
          subtitle: `${t('demote_admin_description')} ${data.user.name}`,
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            updateRoleMutate(
              {
                channel_id: id,
                user_id: data?.user?.id.toString(),
                new_role: 'member',
              },
              {
                onSuccess: () => {
                  toaster('success', t('admin_demoted_successfully'))
                  hideConfirmModal()
                  refetch()
                },
                onError: (error: any) => {
                  const errorMessage = error?.response?.data?.message || t('action_failed')
                  toaster('error', errorMessage)
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      }
    } catch (error) {
      console.error('Action error:', error)
      toaster('error', t('action_failed'))
    }
  }

  const handleBulkActions = (action: string, selectedMembers: SingleCustomField[]) => {
    if (action === 'delete' && selectedMembers.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_user_title'),
        subtitle: `${t('delete_multiple_users_description', { count: selectedMembers.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          deleteChannelMember(
            {
              channel_id: id,
              user_ids: selectedMembers.map((member) => member.user?.id.toString()).filter(Boolean) as string[],
            },
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

  const config: TableConfig<SingleCustomField> = {
    columns,
    data: data?.members || [],
    actionsDropDown,
    total: data?.total,
  }

  pagination.total = data?.total || 0

  const CreateChannelButton = () => (
    <div className="channel-actions d-flex gap-2">
      <SvgIcon iconId="user-add" className="common-svg-hw" onClick={() => setAddMembersModal(true)} />
    </div>
  )

  return (
    <Container fluid>
      <Row>
        <Col xl="12" className="custom-manage-teams">
          <CardWrapper
            heading={{
              title: data?.members?.[0]?.channel_name || 'Manage Channel',
              headerChildren: <CreateChannelButton />,
            }}
            backBtn={true}
          >
            <TableWrapper
              pagination={pagination}
              search={search}
              handleBulkActions={handleBulkActions}
              showDelete={true}
            >
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

            <SimpleModal
              className="custom-channel profile-setting add-members"
              isOpen={addMembersModal}
              onClose={() => setAddMembersModal(false)}
              title={`Add Members to Channel (${data?.members?.[0]?.channel_name || 'Manage Channel'})`}
            >
              <AddChannelMember
                setAddMembersModal={setAddMembersModal}
                addMembersToChannelMutate={addMembersToChannelMutate}
                isAddingMembers={isAddingMembers}
                channelId={data?.members?.[0]?.channel_id}
              />
            </SimpleModal>
          </CardWrapper>
        </Col>
      </Row>
    </Container>
  )
}

export default ChannelMembers
