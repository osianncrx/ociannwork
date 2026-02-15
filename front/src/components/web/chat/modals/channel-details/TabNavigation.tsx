import { useEffect, useMemo } from 'react'
import { Nav, NavItem, NavLink } from 'reactstrap'
import { ChannelRole } from '../../../../../constants'
import { SvgIcon } from '../../../../../shared/icons'
import { useAppSelector } from '../../../../../store/hooks'

const TabNavigation = ({ setAddMembersModal, activeTab, setActiveTab }: any) => {
  const { currentChannel, currentUserRole } = useAppSelector((store) => store.channel)

  const tabItems = useMemo(() => {
    const baseItems = [
      { id: '1', label: 'About' },
      { id: '2', label: 'Members' },
    ]
    if (currentUserRole === ChannelRole.Admin) {
      baseItems.push({ id: '3', label: 'Settings' })
    }

    return baseItems
  }, [currentUserRole])

  useEffect(() => {
    const availableTabIds = tabItems.map((tab) => tab.id)
    if (!availableTabIds.includes(activeTab)) {
      setActiveTab('1')
    }
  }, [tabItems, activeTab])

  return (
    <div className="tab-section">
      <div className="tabs-wrapper d-flex align-items-center justify-content-between">
        <Nav tabs role="tablist">
          {tabItems.map((tab) => (
            <NavItem className="nav-item" role="presentation" key={tab.id}>
              <NavLink
                className={`nav-link ${tab.id === activeTab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === '2' && (
                  <span className="badge bg-light text-dark ms-2">{currentChannel?.members?.length || 0}</span>
                )}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
        {currentUserRole === ChannelRole.Admin && (
          <div className="channel-actions d-flex gap-2">
            <SvgIcon iconId="user-add" className="common-svg-hw" onClick={() => setAddMembersModal(true)} />
          </div>
        )}
      </div>
    </div>
  )
}

export default TabNavigation
