import { FC, useEffect, useState } from 'react'
import { ChatType } from '../../../../constants'
import { SolidButton } from '../../../../shared/button'
import UserChannelSelector from '../../../../shared/form-fields/UserChannelInput'
import { SimpleModal } from '../../../../shared/modal'
import { SelectedUserItem, UserSelectionModalProps } from '../../../../types'


const UserSelectionModal: FC<UserSelectionModalProps> = ({
  isOpen,
  onClose,
  title,
  submitButtonText = 'Submit',
  onSubmit,
  isMulti = true,
  excludeUsers = [],
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedUserItem[]>([])

  const handleSelectionChange = (selected: SelectedUserItem | SelectedUserItem[] | null) => {
    if (Array.isArray(selected)) {
      setSelectedItems(selected)
    } else if (selected) {
      setSelectedItems([selected])
    } else {
      setSelectedItems([])
    }
  }

  const handleSubmit = () => {
    const allSelected: { id: string; type: ChatType.DM | ChatType.Channel }[] = [
      ...(selectedItems
        ?.filter((item) => item.data.type === ChatType.Channel)
        .map((channel) => ({
          id: String(channel.data.id),
          type: ChatType.Channel as const,
        })) || []),
      ...(selectedItems
        ?.filter((item) => item.data.type === 'user')
        .map((user) => ({
          id: String(user.data.id),
          type: ChatType.DM as const,
        })) || []),
    ]

    if (allSelected.length > 0) {
      onSubmit(allSelected)
    }
  }

  const handleClose = () => {
    setSelectedItems([])
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      setSelectedItems([])
    }
  }, [isOpen])

  const totalSelected = selectedItems?.length || 0

  return (
    <SimpleModal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      <div className="user-selection-modal">
        <div className="row">
          <div className="col-md-12">
            <div className="margin-b-20">
              <label className="form-label fw-semibold">Select Channels or Team Members</label>
              <UserChannelSelector
                placeholder="Search channels or team members..."
                isMulti={isMulti}
                includeUsers={true}
                includeChannels={true}
                maxInitialItems={10}
                value={selectedItems}
                onSelectionChange={handleSelectionChange}
                excludeIds={excludeUsers}
                noWrapper={true}
              />
            </div>
          </div>
        </div>
        <div className="margin-t-20 forward-btn">
          <SolidButton
            title={submitButtonText}
            onClick={handleSubmit}
            color="primary"
            className="w-100"
            disabled={totalSelected === 0}
          />
        </div>
      </div>
    </SimpleModal>
  )
}

export default UserSelectionModal
