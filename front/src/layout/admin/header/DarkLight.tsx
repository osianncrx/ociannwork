import { SvgIcon } from "../../../shared/icons";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { addSideBarBackGround } from "../../../store/slices/themeCustomizerSlice";

const DarkLight = () => {
  const dispatch = useAppDispatch()
  const darkModeHandler = (data: string) => dispatch(addSideBarBackGround(data))
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)

  return (
    <li className="nav-menu-li" onClick={() => darkModeHandler(mixBackgroundLayout !== 'light' ? 'light' : 'dark')}>
      {mixBackgroundLayout === 'dark' ? (
        <SvgIcon className="common-svg-hw fill-none for-light" iconId="sun" />
      ) : (
        <SvgIcon className="common-svg-hw fill-none for-dark" iconId="moon" />
      )}
    </li>
  );
};

export default DarkLight;
