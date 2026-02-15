
export interface DeleteModalPros {
  isOpen: boolean
  toggle: () => void
  onConfirm: () => void
  heading?: string
  isLoading?: boolean
  subHeading?:string
}

export interface SearchbarProps {
  placeholder?: string
  onChange: (value: string) => void
  value?: string
  className?: string
  inputClassName?: string
}


export interface AvatarListProps {
  data: any[]
  maxVisible?: number
  customClass?: string
}
