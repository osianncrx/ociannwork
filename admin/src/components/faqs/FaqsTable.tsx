import { useTranslation } from 'react-i18next'
import { mutations, queries } from '../../api'
import { ROUTES } from '../../constants'
import CommonTable from '../../shared/table'
import { Action, Column, SingleFAQ, TableConfig } from '../../types'
import TableWrapper from '../../utils/hoc/TableWrapper'
import { useTableManager } from '../../utils/hooks/useTablemanager'
import { useState } from 'react'
import { ConfirmModal } from '../../shared/modal'
import { toaster } from '../../utils/custom-functions'
import { COLUMN_TYPE } from '../../types/constants'
import { Link } from 'react-router-dom'
import { SolidButton } from '../../shared/button/SolidButton'
import SvgIcon from '../../shared/icons/SvgIcon'

const FaqsTable = () => {
  const { pagination: basePagination, search, params, sort } = useTableManager()
  const { data, isLoading, refetch, isRefetching } = queries.useGetFaqs(params)
  const { mutate } = mutations.useDeleteFaq()
  const { mutate: updateFaqStatus } = mutations.useUpdateFaqStatus()
  const { t } = useTranslation()
  const [tableKey, setTableKey] = useState(0)
  const [, setLoadingStates] = useState<Record<string, boolean>>({})

  const pagination = {
    ...basePagination,
    total: data?.data?.total || 0,
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

  const columns: Column<SingleFAQ>[] = [
    {
      title: 'Question',
      dataField: [
        {
          field: 'question',
          renderer: (data) => (
            <div className="faq-des">
              <div className="faq-data">
                <h5>{data?.question}</h5>
                <div className="faq-answer">
                  <span className="text-truncate" style={{ maxWidth: '300px', display: 'block' }}>
                    {data?.answer}
                  </span>
                </div>
              </div>
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
          type: COLUMN_TYPE.Switch,
          checkCondition: (val) => val === 'active',
          onToggle: (row) =>
            handleActionPerform({
              actionToPerform: 'toggleStatus',
              data: { ...row },
            }),
        },
      ],
    },
    {
      title: 'created_at',
      dataField: [
        {
          type: COLUMN_TYPE.Date,
          field: 'created_at',
          dateformatOptions: { showDate: true, showTime: false },
        },
      ],
    },
  ]

  const actionsDropDown: (Action<SingleFAQ> | string)[] = [
    {
      label: 'edit',
      actionToPerform: 'edit',
      renderer: (row) => (
        <Link to={ROUTES.EDIT_FAQ.replace(':id', row.id.toString())} state={{ faqData: row }}>
          <SolidButton className="btn-bg-secondary">
            <SvgIcon className="common-svg-hw" iconId="table-edit" />
          </SolidButton>
        </Link>
      ),
    },
    'delete',
  ]

  const handleActionPerform = async ({ actionToPerform, data }: { actionToPerform: string; data: SingleFAQ }) => {
    const loadingKey = `${actionToPerform}-${data.id}`

    try {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }))

      if (actionToPerform === 'delete') {
        showConfirmModal({
          variant: 'danger',
          iconId: 'table-delete',
          title: 'Delete FAQ',
          subtitle: 'Are you sure you want to delete this FAQ? This action cannot be undone.',
          confirmText: t('delete'),
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }))
            mutate(
              { ids: [data.id] },
              {
                onSuccess: () => {
                  toaster('success', 'FAQ deleted successfully')
                  hideConfirmModal()
                  setTableKey((prev) => prev + 1)
                  refetch()
                },
                onError: (error) => {
                  console.error('Delete error:', error)
                  toaster('error', 'Failed to delete FAQ')
                  setConfirmModal((prev) => ({ ...prev, isLoading: false }))
                },
              },
            )
          },
        })
        return
      } else if (actionToPerform === 'toggleStatus') {
        const faqToUpdate = data as SingleFAQ
        const newStatus = faqToUpdate.status === 'active' ? 'deactive' : 'active'

        updateFaqStatus(
          {
            id: faqToUpdate.id,
            status: newStatus,
          },
          {
            onSuccess: () => {
              toaster('success', 'FAQ status updated successfully')
              refetch()
            },
            onError: () => {
              toaster('error', 'Failed to update FAQ status')
            },
          },
        )
        return
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const handleBulkActions = (action: string, selectedFaqs: SingleFAQ[]) => {
    if (action === 'delete' && selectedFaqs.length > 0) {
      showConfirmModal({
        variant: 'danger',
        iconId: 'table-delete',
        title: t('delete_faq_title'),
        subtitle: `${t('delete_multiple_faqs_description', { count: selectedFaqs.length })}`,
        confirmText: t('delete'),
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }))
          mutate(
            { ids: selectedFaqs.map((user) => user.id) },
            {
              onSuccess: () => {
                toaster('success', t('faqs_deleted_successfully', { count: selectedFaqs.length }))
                hideConfirmModal()
                refetch()
              },
              onError: (error) => {
                console.error('Delete error:', error)
                toaster('error', t('failed_to_delete_faqs'))
                setConfirmModal((prev) => ({ ...prev, isLoading: false }))
              },
            },
          )
        },
      })
    }
  }

  const config: TableConfig<SingleFAQ> = {
    columns,
    data: data?.data?.faqs || [],
    actionsDropDown,
    total: data?.data?.total,
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
        loadingText="Processing..."
        iconId={confirmModal.iconId}
      />
    </>
  )
}

export default FaqsTable
