import { FC } from 'react'
import { X } from 'react-feather'
import Select, { MultiValueGenericProps } from 'react-select'
import { OptionType, SearchableSelectProps } from '../../types'

const SearchableSelect: FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  isClearable = true,
  isMulti = false,
  ...rest
}) => {
  const MultiValueRemove = () => {
    return (
      <div
        className="multi-value-remove"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <X size={14} />
      </div>
    )
  }

  const MultiValueContainer = (props: MultiValueGenericProps<OptionType>) => {
    return (
      <div className="multi-value-container">
        <span className="multi-value-label">{props.data.label}</span>
        {props.children}
      </div>
    )
  }

  return (
    <div className="searchable-select-container">
      <Select
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isClearable={isClearable}
        isSearchable
        isMulti={isMulti}
        components={{
          ...(isMulti && {
            MultiValueRemove,
            MultiValueContainer,
          }),
        }}
        classNamePrefix="react-select"
        {...rest}
      />
    </div>
  )
}

export default SearchableSelect
