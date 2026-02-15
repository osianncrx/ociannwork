import { memo, useRef, useImperativeHandle, forwardRef } from 'react'
import { SvgIcon } from '../../../../../shared/icons'
import { SearchBoxProps } from '../../../../../types'

const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(({ value, onChange }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  return (
    <div className="search-box">
      <div className="position-relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Start a chat (Alt + K)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="search-icon">
          <SvgIcon iconId="search-bar" />
        </div>
      </div>
    </div>
  )
})

export default memo(SearchBox)
