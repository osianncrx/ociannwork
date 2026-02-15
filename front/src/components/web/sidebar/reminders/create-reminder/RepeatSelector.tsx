import { FC } from 'react'
import { SearchableSelectInput } from '../../../../../shared/form-fields'
import { OptionType, RepeatSelectorProps } from '../../../../../types'

const RepeatSelector: FC<RepeatSelectorProps> = ({ repeatOption, onRepeatChange }) => {
  const repeatOptions: OptionType[] = [
    { value: 'Do not repeat', label: 'Do not repeat' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
  ]

  return (
    <SearchableSelectInput
      name="repeat"
      placeholder="Select repeat option"
      options={repeatOptions}
      value={repeatOption}
      onOptionChange={(selected: OptionType | OptionType[] | null) => onRepeatChange(selected as OptionType | null)}
      isMulti={false}
      isClearable={false}
      noWrapper={true}
    />
  )
}

export default RepeatSelector
