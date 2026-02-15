import { FC, useState } from 'react'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import SvgIcon from '../icons/SvgIcon'
import { PerPageProps } from '../../types'
import { useTranslation } from 'react-i18next'

const PerPage: FC<PerPageProps> = ({ itemsPerPage, perPageValues = [10, 25, 50, 100], onChange }) => {
  const { t } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = () => setDropdownOpen((prev) => !prev)
  const handleSelect = (size: number) => {
    onChange(size)
    setDropdownOpen(false)
  }

  return (
    <div className="selection-box d-flex align-items-center common-flex-start gap-2">
      <label>{t('show')}:</label>

      <Dropdown isOpen={dropdownOpen} toggle={toggle}>
        <DropdownToggle color='white' className="form-control custom-control">
          <span>{itemsPerPage}</span>
          <SvgIcon iconId="drop-down" className="common-svg-md ms-2" />
        </DropdownToggle>
        <DropdownMenu>
          {perPageValues.map((size) => (
            <DropdownItem
              key={size}
              active={size === itemsPerPage}
              onClick={() => handleSelect(size)}
              className="custom-control-item"
            >
              {size}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      <label>{t('items_per_page')}</label>
    </div>
  )
}

export default PerPage
