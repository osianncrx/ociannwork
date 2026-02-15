import {SvgIcon} from "../../../shared/icons";

const FullScreen = () => {
  const toggleFullScreen = (element: HTMLElement = document.documentElement): void => {
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        console.error(`Error trying to enter full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error trying to exit full-screen mode: ${err.message}`);
      });
    }
  };
  return (
    <li className="nav-menu-li" onClick={() => toggleFullScreen()}>
      <span>
        <SvgIcon iconId="full-screen" className="common-svg-hw" />
      </span>
    </li>
  );
};

export default FullScreen;
