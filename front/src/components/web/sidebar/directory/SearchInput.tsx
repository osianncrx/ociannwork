import { SvgIcon } from '../../../../shared/icons'
import { SearchInputProps } from '../../../../types/common'
import { ChangeEvent } from 'react'

const SearchInput = ({ value, onChange, onReset, placeholder }: SearchInputProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleClear = () => {
    onChange('')
    if (onReset) {
      onReset()
    }
  }

  return (
    <div className="search-box">
      <div className="position-relative">
        <input type="text" value={value} onChange={handleChange} placeholder={placeholder} />
        <div className="search-icon">
          {value ? (
            <SvgIcon onClick={handleClear} className="clear-search" iconId="close" />
          ) : (
            <SvgIcon iconId="search-bar" />
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchInput
