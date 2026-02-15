import { FormGroup, Input } from 'reactstrap'
import SvgIcon from '../../shared/icons/SvgIcon'
import { SearchbarProps } from '../../types'

const Searchbar = ({ placeholder = 'Search...', onChange, value = '', inputClassName = '' }: SearchbarProps) => {
  return (
    <div className="flex-end">
      <div className="login-form">
        <div className="login-input custom-search-input">
          <FormGroup className="text-start">
            <Input
              placeholder={placeholder}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={inputClassName}
            />
            <SvgIcon className="form-icon" iconId="search-header" />
          </FormGroup>
        </div>
      </div>
    </div>
  )
}

export default Searchbar
