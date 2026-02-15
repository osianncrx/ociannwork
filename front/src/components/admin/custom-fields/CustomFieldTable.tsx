import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { mutations, queries } from '../../../api'
import { ColumnType, ROUTES } from '../../../constants'
import CommonTable from '../../../shared/table'
import { Action, Column, SingleCustomField, TableConfig, ActionData } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import TableWrapper from '../../../utils/hoc/TableWrapper'
import { useTableManager, useDeleteConfirmation } from '../../../utils/hooks'
import DeleteModal from '../widgets/DeleteModal'

const CustomFieldTable = () => {
  const { pagination, search, params } = useTableManager()
  const { data, isLoading, isRefetching } = queries.useGetCustomFieldList(params)
  pagination.total = data?.total || 0
  const { mutate: deleteCustomField, isPending } = mutations.useDeleteCustomField()
  const { isOpen, hide, show, itemToDelete } = useDeleteConfirmation<SingleCustomField>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const columns: Column<SingleCustomField>[] = [
    {
      title: 'custom_field',
      dataField: [
        {
          field: 'name',
          renderer: (data) => (
            <div className="team-des">
              <div className="user-data">
                <h5>{data?.field_name}</h5>
                <div className="users">
                  <ul>
                    <li>
                      <span>{data?.description}</span>
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
      title: 'created_at',
      dataField: [
        {
          field: 'created_at',
          type: ColumnType.Date,
        },
      ],
    },
  ]

  const actionsDropDown: (Action<SingleCustomField> | string)[] = ['edit', 'delete']

  const handleDeleteCustomField = () => {
    if (itemToDelete?.id !== undefined) {
      deleteCustomField(
        { id: itemToDelete.id },
        {
          onSuccess: () => {
            hide()
            toaster('success', t('custom_field_deleted_successfully'))
          },
        },
      )
    }
  }

  const handleActionPerform = ({
    actionToPerform,
    data,
  }: {
    actionToPerform: string
    data: ActionData
  }) => {
    if (actionToPerform === 'delete') {
      show(data as SingleCustomField)
      return
    }

    if (actionToPerform === 'edit') {
      if ('fields' in data && data.fields.length > 0) {
        navigate(ROUTES.ADMIN.CREATE_CUSTOM_FIELD, {
          state: { customField: data.fields[0] },
        })
      }
    }
  }

  const config: TableConfig<SingleCustomField> = {
    columns,
    data: (data?.fields ?? [])?.map((field) => ({
      id: field?.id,
      name: field.field_name,
      field_name: field.field_name,
      description: field.description,
      created_at: field?.created_at,
      created_by: field,
      team_role: '',
      status: '',
      fields: [field],
    })),
    actionsDropDown,
    total: data?.total,
  }

  return (
    <>
      <TableWrapper pagination={pagination} search={search} showDelete={false}>
        <CommonTable
          isRefetching={isRefetching}
          isLoading={isLoading}
          tableConfiguration={config}
          onActionPerform={handleActionPerform}
        />
      </TableWrapper>
      <DeleteModal isOpen={isOpen} toggle={hide} onConfirm={handleDeleteCustomField} isLoading={isPending} />
    </>
  )
}

export default CustomFieldTable
