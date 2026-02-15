import { Nav, NavItem, NavLink } from 'reactstrap'
import { DirectoryTabsProps } from '../../../../types'

const DirectoryTabs = ({ activeTab, onTabChange, tabItems }: DirectoryTabsProps) => {
  return (
    <div className="tab-section">
      <div className="tabs-wrapper">
        <Nav tabs>
          {tabItems.map((tab) => (
            <NavItem className="nav-item" key={tab.id}>
              <NavLink
                className={`nav-link ${tab.id === activeTab ? 'active' : ''}`}
                id={`${tab.id}-tab`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
      </div>
    </div>
  )
}

export default DirectoryTabs
