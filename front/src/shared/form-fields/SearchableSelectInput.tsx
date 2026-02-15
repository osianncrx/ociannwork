import { FC } from 'react'
import Select, {
  components,
  GroupBase,
  MultiValue,
  OptionsOrGroups,
  Props as SelectProps,
  SingleValue,
} from 'react-select'
import { Button } from 'reactstrap'
import { OptionType, SearchableSelectProps } from '../../types'
import FormFieldWrapper from './widgets/FormFieldWrapper'

interface CustomProps {
  showAddButton?: boolean
  onAddClick?: (option: OptionType) => void
}

const CustomOption = (props: any) => {
  const { data, isSelected, selectProps } = props
  const { showAddButton, onAddClick } = selectProps as CustomProps

  return (
    <components.Option {...props}>
      <div className="d-flex justify-content-between align-items-center">
        <span>{data.label}</span>
        {showAddButton && (
          <Button
            color={isSelected ? 'success' : 'primary'}
            size="sm"
            disabled={isSelected}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddClick?.(data)
            }}
          >
            {isSelected ? 'Added' : 'Add'}
          </Button>
        )}
      </div>
    </components.Option>
  )
}

const SearchableSelectInput: FC<
  SearchableSelectProps & {
    isMulti?: boolean
    showAddButton?: boolean
    hideDropdown?: boolean
    onAddClick?: (option: OptionType) => void
    noWrapper?: boolean
    formatOptionLabel?: any
    filterOption?: any
    isLoading?: boolean
    closeMenuOnSelect?: boolean
  }
> = ({
  label,
  id,
  name,
  options,
  value,
  onOptionChange,
  placeholder = 'Select a value',
  isClearable = true,
  isMulti = false,
  showAddButton = false,
  onAddClick,
  error,
  touched,
  formGroupClass = '',
  helperText,
  layout = 'horizontal',
  noWrapper = false,
  noOptionsMessage,
  closeMenuOnSelect,
  ...rest
}) => {
  const hasError = touched && !!error
  const inputId = id || name

  const handleChange = (newValue: SingleValue<OptionType> | MultiValue<OptionType>) => {
    if (isMulti) {
      const multiVal = Array.isArray(newValue) ? newValue : []
      onOptionChange?.(multiVal.length ? multiVal : [])
    } else {
      onOptionChange?.(newValue as OptionType | [])
    }
  }

  const selectProps: SelectProps<OptionType, boolean, GroupBase<OptionType>> & CustomProps = {
    inputId,
    name,
    options: options as OptionsOrGroups<OptionType, GroupBase<OptionType>>,
    value,
    placeholder,
    isClearable,
    isSearchable: true,
    isMulti,
    classNamePrefix: 'react-select',
    className: hasError ? 'is-invalid' : '',
    components: { Option: CustomOption },
    onChange: handleChange,
    showAddButton,
    onAddClick,
    closeMenuOnSelect: closeMenuOnSelect !== undefined ? closeMenuOnSelect : !isMulti,
    ...rest,
  }

  return noWrapper ? (
    <Select {...selectProps} />
  ) : (
    <FormFieldWrapper
      label={label}
      name={name}
      id={inputId}
      layout={layout}
      helperText={helperText}
      formGroupClass={formGroupClass}
      error={error}
      touched={touched}
    >
      <Select {...selectProps} />
    </FormFieldWrapper>
  )
}

export default SearchableSelectInput
