/* eslint-disable react-hooks/exhaustive-deps */
import { FC, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Href } from '../../constants'
import SvgIcon from '../../shared/icons/SvgIcon'
import { MenuItem, MenuListProps } from '../../types'

const SubMenu: FC<MenuListProps> = ({ menu, setActiveMenu, activeMenu, level }) => {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const activeNavLinkUrl = (path?: string) => {
    return pathname === path ? true : ''
  }

  useEffect(() => {
    menu?.forEach((item) => {
      const gotValue = shouldSetActive({ item })
      if (gotValue) {
        const temp = [...activeMenu]
        temp[level] = item
        setActiveMenu(temp)
      }
    })
  }, [pathname])

  const shouldSetActive = ({ item }: { item: MenuItem }): boolean => {
    let returnValue = false
    if (item?.url === pathname) {
      returnValue = true
    }
    if (!returnValue && item?.menu) {
      item?.menu.every((subItem: MenuItem) => {
        returnValue = shouldSetActive({ item: subItem })
        return !returnValue
      })
    }
    return returnValue
  }

  useEffect(() => {
    menu?.forEach((item) => {
      const gotValue = shouldSetActive({ item })
      if (gotValue) {
        const temp = [...activeMenu]
        temp[level] = item
        setActiveMenu(temp)
      }
    })
  }, [])

  return (
    <>
      {menu?.map((item, i) => (
        <li
          key={i}
          className={`${level === 0 ? 'sidebar-list' : ''} ${
            (item.menu
              ? item.menu.map((innerItem) => activeNavLinkUrl(innerItem.url)).includes(true)
              : activeNavLinkUrl(item.url)) || activeMenu[level]?.title === item.title
              ? 'active'
              : ''
          }`}
        >
          <Link
            className={`${level === 0 ? 'sidebar-link sidebar-title' : ''} ${
              (item.menu
                ? item.menu.map((innerItem) => activeNavLinkUrl(innerItem.url)).includes(true)
                : activeNavLinkUrl(item.url)) || activeMenu[level]?.title === item.title
                ? 'active'
                : ''
            }`}
            to={item.url ? item.url : Href}
            onClick={() => {
              const temp = [...activeMenu] 
              temp[level] = temp[level]?.title !== item.title ? item : ({} as MenuItem)
              setActiveMenu(temp)
            }}
          >
            {item.icon && <SvgIcon className="sidebar-icon" iconId={item.icon} />}
            {level === 0 ? <span>{`${t(item.title)}`}</span> : item.title}
            {item.menu && (
              <div className="according-menu">
                {activeMenu[level]?.title === item.title ? (
                  <i className="fa fa-angle-down" />
                ) : (
                  <i className="fa fa-angle-right" />
                )}
              </div>
            )}
          </Link>
          {item.menu && (
            <ul
              className={level !== 0 ? 'submenu-content open-sub-mega-menu' : 'sidebar-submenu'}
              style={{
                display: `${
                  (item.menu
                    ? item.menu.map((innerItem) => activeNavLinkUrl(innerItem.url)).includes(true)
                    : activeNavLinkUrl(item.url)) || activeMenu[level]?.title === item.title
                    ? 'block'
                    : 'none'
                }`,
              }}
            >
              <SubMenu menu={item.menu} activeMenu={activeMenu} setActiveMenu={setActiveMenu} level={level + 1} />
            </ul>
          )}
        </li>
      ))}
    </>
  )
}
export default SubMenu
