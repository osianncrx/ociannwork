import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import { SvgIcon } from '../../shared/icons'
import { PerPageProps } from '../../types'

const PerPage: FC<PerPageProps> = ({ itemsPerPage, perPageValues = [15, 25, 50, 100], onChange }) => {
  const { t } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const toggle = () => setDropdownOpen((prev) => !prev)

  const handleSelect = (size: number) => {
    onChange(size)
    setDropdownOpen(false)
  }

  return (
    <div className="selection-box common-flex-start gap-2">
      <label>{t('Show')}:</label>

      <Dropdown isOpen={dropdownOpen} toggle={toggle}>
        <DropdownToggle className="form-control custom-control">
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

      <label>{t('Items per page')}</label>
    </div>
  )
}

export default PerPage
