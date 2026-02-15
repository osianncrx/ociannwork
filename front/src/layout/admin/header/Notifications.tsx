import {SvgIcon} from "../../../shared/icons";

const Notifications = () => {
  return (
    <li className="notification-down nav-menu-li on-hover-dropdown">
      <div className="notification-box">
        <SvgIcon iconId="notification-header" className="common-svg-hw" />
      </div>
    </li>
  );
};

export default Notifications;
