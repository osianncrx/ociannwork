import { FC } from 'react'
import { Nav, NavItem } from 'reactstrap'
import SvgIcon from '../icons/SvgIcon'
import { TabHeaderProps } from '../../types'

const TabHeader: FC<TabHeaderProps> = ({ tabs = [], activeId, setActiveId }) => {
  return (
    <div className="tab-section">
      <div className="tabs-wrapper">
        <Nav tabs role="tablist">
          {tabs.map((tab) => (
            <NavItem className="nav-item" role="presentation" key={tab.id}>
              <button
                className={`nav-link ${tab.id === activeId ? 'active' : ''}`}
                id={`${tab.id}-tab`}
                type="button"
                role="tab"
                onClick={() => setActiveId(tab.id)}
              >
                {tab.icon && <SvgIcon className="common-svg-btn me-2" iconId={tab.icon} />}
                {tab.label}
              </button>
            </NavItem>
          ))}
        </Nav>
      </div>
    </div>
  )
}

export default TabHeader
