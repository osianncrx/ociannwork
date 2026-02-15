import { cloneElement, useState } from 'react'
import { Tooltip } from 'reactstrap'
import { v4 as uuidv4 } from 'uuid'
import { HintProps } from '../../types'

const Hint = ({ label, children, placement = 'top', forceOpen = false }: HintProps) => {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [id] = useState(`hint-${uuidv4().replace(/-/g, '')}`)

  const toggle = () => setTooltipOpen(!tooltipOpen)

  const isOpen = forceOpen || tooltipOpen

  const childWithProps = cloneElement(children, {
    id,
  })

  return (
    <>
      {childWithProps}
      <Tooltip placement={placement} isOpen={isOpen} target={id} toggle={toggle}>
        {label}
      </Tooltip>
    </>
  )
}

export default Hint
