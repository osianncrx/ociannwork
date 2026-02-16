import { useState } from 'react'
import {
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Nav,
  Navbar,
  NavbarBrand,
  NavbarToggler,
  NavItem,
  NavLink,
  UncontrolledDropdown,
} from 'reactstrap'
import { SvgIcon } from '../../../shared/icons'
import { Image } from '../../../shared/image'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { addSideBarBackGround } from '../../../store/slices/themeCustomizerSlice'
import { HelpHeaderProps } from '../../../types'

const Header = ({ activeTab, setActiveTab, tabArray }: HelpHeaderProps) => {
  const dispatch = useAppDispatch()
  const darkModeHandler = (data: string) => dispatch(addSideBarBackGround(data))
  const { mixBackgroundLayout } = useAppSelector((store) => store.theme)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggleDropdown = () => setDropdownOpen((prev) => !prev)
  const { contact_email, contact_phone, company_address, support_email } = useAppSelector((state) => state.setting)
  const { logo_light_url, logo_dark_url } = useAppSelector((state) => state.setting)

  const mainSlugs = ['faqs', 'terms', 'privacy-policy']
  const mainTabs = tabArray.filter((tab) => mainSlugs.includes(tab.slug?.toLowerCase()))
  const extraTabs = tabArray.filter((tab) => !mainSlugs.includes(tab.slug?.toLowerCase()))

  return (
    <div>
      <div className="home-section">
        <Navbar className="navbar-expand-lg" light>
          <Container className="custom-container">
            <div className="main-menu">
              <NavbarBrand href="/" className="d-flex">
                {logo_light_url ? (
                  <Image
                    src={mixBackgroundLayout !== 'light' ? logo_light_url : logo_dark_url}
                    alt="OciannWork"
                    height={80}
                  />
                ) : (
                  <Image src="/logo/ociannwork-logo.png" alt="OciannWork" height={80} />
                )}
                <p>Help Center</p>
              </NavbarBrand>
              <div>
                <NavbarToggler className="collapsed">
                  <i className="fa fa-bars"></i>
                </NavbarToggler>
              </div>
              <ul className="nav-right">
                <li onClick={() => darkModeHandler(mixBackgroundLayout !== 'light' ? 'light' : 'dark')}>
                  <a className="btn border-light mode" href="#" title="Dark">
                    {mixBackgroundLayout === 'dark' ? (
                      <SvgIcon className="common-svg-hw for-light" iconId="sun" />
                    ) : (
                      <SvgIcon className="common-svg-hw for-dark" iconId="moon" />
                    )}
                  </a>
                </li>
                <UncontrolledDropdown nav>
                  <DropdownToggle color="transparent" className="btn border-light mode text-white" caret>
                    Contact
                  </DropdownToggle>
                  <DropdownMenu>
                    <DropdownItem href="#" className="faq-dropdown-item">
                      <ul className="faq-dropdown">
                        <li>
                          <SvgIcon className="common-svg-hw" iconId="faq-address" />
                          <span>{contact_email}</span>
                        </li>
                        <li>
                          <SvgIcon className="common-svg-hw" iconId="faq-email" />
                          <span>{contact_phone}</span>
                        </li>
                        <li>
                          <SvgIcon className="common-svg-hw" iconId="faq-profile" />
                          <span>{company_address}</span>
                        </li>
                        <li>
                          <SvgIcon className="common-svg-hw" iconId="faq-profile" />
                          <span>{support_email}</span>
                        </li>
                      </ul>
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </ul>
            </div>
          </Container>
        </Navbar>
        <Container className="custom-container">
          <div className="document">Hi! How can we help?</div>
          <div className="top-heading"></div>
        </Container>
        <div className="bottom-header">
          <Nav tabs className="border-0">
            {mainTabs.map((tab) => (
              <NavItem key={tab.id} className="mx-sm-2">
                <NavLink
                  className={tab.id === activeTab ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                  role="button"
                >
                  {tab.title}
                </NavLink>
              </NavItem>
            ))}
          </Nav>
          {extraTabs.length > 0 && (
            <Dropdown nav inNavbar isOpen={dropdownOpen} toggle={toggleDropdown} className="mx-2">
              <DropdownToggle nav className="p-0 border-0 bg-transparent">
                <SvgIcon iconId="more-vertical" className="common-svg-hw-btn" />
              </DropdownToggle>
              <DropdownMenu>
                {extraTabs.map((tab) => (
                  <DropdownItem
                    key={tab.id}
                    active={tab.id === activeTab}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setDropdownOpen(false)
                    }}
                  >
                    {tab.title}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
