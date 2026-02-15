import { FC } from 'react'
import { Nav, NavItem, NavLink } from 'reactstrap'
import SvgIcon from '../icons/SvgIcon'
import { TabHeaderProps } from '../../types'
import { useTranslation } from 'react-i18next'

const TabHeader: FC<TabHeaderProps> = ({ tabs = [], activeId, setActiveId, vertical = true }) => {
  const { t } = useTranslation()
  return (
    <>
      {vertical ? (
        <Nav tabs className=" nav-pills" role="tablist">
          {tabs.map((tab) => (
            <NavItem className="nav-item" role="presentation" key={tab.id}>
              <NavLink
                className={`nav-link ${tab.id === activeId ? 'active' : ''}`}
                id={`${tab.id}-tab`}
                onClick={() => setActiveId(tab.id)}   
              >
                {tab.icon ? <SvgIcon className="common-svg-btn me-2" iconId={tab.icon} /> : null}
                {t(tab.label)} {Number(tab.count)  ? `(${tab.count})` : null}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
      ) : (
        <div className="tab-section">
          <div className="tabs-wrapper">
            <Nav tabs className=" mb-3" role="tablist">
              {tabs.map((tab) => (
                <NavItem className="nav-item" role="presentation" key={tab.id}>
                  <NavLink
                    className={`nav-link ${tab.id === activeId ? 'active' : ''}`}
                    id={`${tab.id}-tab`}
                    type="button"
                    role="tab"
                    onClick={() => setActiveId(tab.id)}
                  >
                    {tab.icon && <SvgIcon className="common-svg-btn me-2" iconId={tab.icon} />}
                    {t(tab.label)} {Number(tab.count) ?`(${tab.count})`:null}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </div>
        </div>
      )}
    </>
  )
}

export default TabHeader
