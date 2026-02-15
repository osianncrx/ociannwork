import { FormGroup, Input } from 'reactstrap'
import { SvgIcon } from '../../../../shared/icons'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { addSideBarBackGround } from '../../../../store/slices/themeCustomizerSlice'

const ThemeMode = () => {
  const dispatch = useAppDispatch()
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)
  const darkModeHandler = (data: string) => dispatch(addSideBarBackGround(data))

  const handleDarkModeToggle = () => {
    const newMode = mixBackgroundLayout !== 'light' ? 'light' : 'dark'
    darkModeHandler(newMode)
  }

  return (
    <>
      <li className="chat-item" onClick={handleDarkModeToggle}>
        <div className={`mode ${mixBackgroundLayout !== 'light' ? 'active' : ''}`}>
          {mixBackgroundLayout === 'dark' ? (
            <SvgIcon className="common-svg-hw for-dark" iconId="light-mode" />
          ) : (
            <SvgIcon className="common-svg-hw for-light" iconId="dark-mode" />
          )}
        </div>
        Dark-Mode
        <FormGroup switch>
          <Input type="switch" checked={mixBackgroundLayout !== 'light'} onChange={handleDarkModeToggle} />
        </FormGroup>
      </li>
    </>
  )
}

export default ThemeMode
