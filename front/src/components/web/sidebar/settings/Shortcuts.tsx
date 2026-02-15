import { useState } from 'react'
import { SvgIcon } from '../../../../shared/icons'
import { SimpleModal } from '../../../../shared/modal'

const Shortcuts = () => {
  const [open, setOpen] = useState(false)

  const shortcuts = [
    { keys: 'Alt + K', label: 'New Chat' },
    { keys: 'Ctrl + D', label: 'Recent Chats, Contacts and Directory' },
    { keys: 'Ctrl + E', label: 'Focus On Message Editor' },
    { keys: 'Ctrl + F', label: 'Search In Chat Messages' },
    { keys: 'Ctrl + Shift + F', label: 'Global Message Search' },
  ]

  return (
    <>
      <li className="chat-item" onClick={() => setOpen(true)}>
        <SvgIcon className="common-svg-hw shortcut" iconId="shortcuts" />
        Shortcuts
      </li>

      <SimpleModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Keyboard Shortcuts"
        size="md"
        bodyClassName="p-3"
      >
        <ul className="shortcuts-list">
          {shortcuts.map((item, idx) => (
            <li key={idx}>
              <span className="fw-semibold text-nowrap">{item.keys}</span>
              <span>-</span>
              <span className="text-muted flex-grow-1">{item.label}</span>
            </li>
          ))}
        </ul>
      </SimpleModal>
    </>
  )
}

export default Shortcuts
