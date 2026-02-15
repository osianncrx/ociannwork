import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { Href, ROUTES } from "../../../constants";
import { SvgIcon } from "../../../shared/icons";
import { MenuItem, MenuListProps } from "../../../types";

const SubMenu: FC<MenuListProps> = ({ menu, setActiveMenu, activeMenu, level }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const ActiveNavLinkUrl = (path?: string) => {
    return location.pathname === path ? true : "";
  };
  const shouldSetActive = ({ item }: { item: MenuItem }): boolean => {
    let returnValue = false;
    if (item?.url === location.pathname) {
      returnValue = true;
    }
    if (!returnValue && item?.menu) {
      item?.menu.every((subItem: MenuItem) => {
        returnValue = shouldSetActive({ item: subItem });
        return !returnValue;
      });
    }
    return returnValue;
  };
  useEffect(() => {
    menu?.forEach((item) => {
      const gotValue = shouldSetActive({ item });
      if (gotValue) {
        const temp = [...activeMenu];
        temp[level] = item;
        setActiveMenu(temp);
      }
    });
  }, []);
  return (
    <>
      {menu?.map((item, i) => (
        <li
          key={i}
          className={`${level === 0 ? "sidebar-list" : ""} ${
            (item.menu ? item.menu.map((innerItem) => ActiveNavLinkUrl(innerItem.url)).includes(true) : ActiveNavLinkUrl(item.url)) ||
            activeMenu[level]?.title === item.title
              ? "active"
              : ""
          }`}
        >
          <Link
            className={`${level === 0 ? "sidebar-link sidebar-title" : ""} ${
              (item.menu ? item.menu.map((innerItem) => ActiveNavLinkUrl(innerItem.url)).includes(true) : ActiveNavLinkUrl(item.url)) ||
              activeMenu[level]?.title === item.title
                ? "active"
                : ""
            }`}
            to={item.url ? item.url : Href}
            onClick={() => {
              const temp = [...activeMenu]; // Copy array
              temp[level] = temp[level]?.title !== item.title ? item : ({} as MenuItem); 
              setActiveMenu(temp);
            }}
          >
            {item.icon && <SvgIcon className="sidebar-icon" iconId={item.icon} />}
            {level === 0 ? (
              <span>
                {`${t(item.title)}`}
                {item.url === ROUTES.ADMIN.WALLET && (
                  <span className="ms-1 text-muted small">(extended)</span>
                )}
              </span>
            ) : (
              item.title
            )}
            {item.menu && (
              <div className="according-menu">
                {activeMenu[level]?.title === item.title ? <i className="fa fa-angle-down" /> : <i className="fa fa-angle-right" />}
              </div>
            )}
          </Link>
          {item.menu && (
            <ul
              className={level !== 0 ? "submenu-content open-sub-mega-menu" : "sidebar-submenu"}
              style={{
                display: `${
                  (item.menu ? item.menu.map((innerItem) => ActiveNavLinkUrl(innerItem.url)).includes(true) : ActiveNavLinkUrl(item.url)) ||
                  activeMenu[level]?.title === item.title
                    ? "block"
                    : "none"
                }`,
              }}
            >
              <SubMenu menu={item.menu} activeMenu={activeMenu} setActiveMenu={setActiveMenu} level={level + 1} />
            </ul>
          )}
        </li>
      ))}
    </>
  );
};
export default SubMenu;
