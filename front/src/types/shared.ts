import { FormikErrors, FormikHelpers } from 'formik'
import {
  ButtonHTMLAttributes,
  ChangeEvent,
  ComponentProps,
  HTMLAttributes,
  ImgHTMLAttributes,
  JSX,
  MouseEventHandler,
  ReactElement,
  ReactNode,
} from 'react'
import { InputActionMeta } from 'react-select'
import { Card, CardBody, CardFooter, CardHeader, InputProps } from 'reactstrap'
import { ColumnType } from '../constants'
import { ID } from './common'

// ************ Buttons ***********
export interface SolidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  color?: string
  icon?: string
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
  iconClass?: string
}

// ************ Cards ***********
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  children?: ReactNode
}

export interface CardWrapperProps {
  heading?: {
    title?: string
    subtitle?: string
    headerChildren?: ReactNode
    customHeader?: ReactNode
  }
  footer?: {
    content: ReactNode
  }
  cardClassName?: string
  className?: string
  children?: ReactNode
  cardProps?: ComponentProps<typeof Card>
  headerProps?: ComponentProps<typeof CardHeader>
  bodyProps?: ComponentProps<typeof CardBody>
  footerProps?: ComponentProps<typeof CardFooter>
  headerActions?: HeaderActionsConfig
  showAddNew?: AddNewConfig
  backBtn?: boolean
  createChannelBtn?: boolean
  addMember?: boolean
  channelId?: number
}
export interface HeaderActionsConfig {
  showImport?: boolean
  showExport?: boolean
  onImport?: () => void
  onExport?: () => void
  importText?: string
  exportText?: string
  importUrl?: string
  exportUrl?: string
  exportFileName?: string
  exportParams?: Record<string, string>
}

export interface AddNewConfig {
  onClick?: () => void
  redirectUrl?: string
  text?: string
}

// ************ Form/Input Fields ***********

export interface TextInputProps extends InputProps {
  label?: string
  name: string
  iconProps?: SvgProps
  children?: ReactNode
  containerClass?: string
  labelClass?: string
  formGroupClass?: string
  onlyAlphabets?: boolean
  layout?: 'horizontal' | 'vertical'
  helperText?: string
}
export type PhoneInputGroupProps = {
  label?: string
  name: string
  codeName: string
  formGroupClass?: string
  xxlClass?: number
  xxlClass2?: number
}

export interface OptionType {
  label: string
  value: string | number
}

export interface SearchableSelectProps {
  name?: string
  label?: string
  id?: string
  value?: OptionType | OptionType[] | null
  onOptionChange?: (value: OptionType | OptionType[] | null) => void
  options?: OptionType[]
  placeholder?: string
  isClearable?: boolean
  isSearchable?: boolean
  isMulti?: boolean
  error?: string
  touched?: boolean
  formGroupClass?: string
  className?: string
  helperText?: string
  layout?: 'vertical' | 'horizontal'
  onInputChange?: (inputValue: string, actionMeta: InputActionMeta) => void
  noOptionsMessage?: ({ inputValue }: { inputValue: string }) => string | string
}

export interface SwitchInputProps {
  layout?: 'vertical' | 'horizontal'
  helperText?: string
  name: string
  id?: string
  label?: string
  containerClass?: string
  labelClass?: string
  iconProps?: {
    iconId: string
    className?: string
  }
  formGroupClass?: string
  onToggle?: (checked: boolean) => void
  disabled?: boolean
  checked?: boolean
}

export interface MediaInputProps {
  name: string
  label: string
  type?: 'image' | 'video'
  description?: string
  className?: string
  accept?: string
}

export interface OtpInputProps {
  val: string[]
  setVal: (val: string[]) => void
  submitForm?: (values: { otp: string }, formikHelpers: FormikHelpers<{ otp: string }>) => void
}

export type ToggleSwitchProps = {
  label: string
  name: string
  id?: string
}

export interface RadioButtonProps {
  name: string
  label?: string
  options: { label: string; value: string | number }[]
  iconProps?: {
    iconId: string
    className?: string
  }
  formGroupClass?: string
  containerClass?: string
  inline?: boolean
}

export interface CheckboxProps {
  name: string
  label: string
  iconProps?: {
    iconId: string
    className?: string
  }
  formGroupClass?: string
  containerClass?: string
  customClass?: boolean
  labelClass?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

// ************ Images ***********
export interface AvatarProps {
  data?: {
    avatar?: string | null
    profile_color?: string | null
    type?: string
    name?: string
    first_name?: string
  }
  placeHolder?: string
  channel?: boolean
  name?: {
    first_name?: string
    name?: string
  }
  customClass?: string
  height?: number
  width?: number
  noPrevClass?: boolean
  nameWithRound?: boolean
  type?: string
}

export type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: any
  baseUrl?: string
  fallbackSrc?: string
}

// ************ Svg's ***********

export interface SvgProps {
  id?: string
  iconId: string | undefined
  className?: string
  style?: {
    height?: number
    width?: number
    fill?: string
    marginRight?: number
  }
  onClick?: (e?: any) => void
  title?:string
}

// ************ Tabs ***********

interface TabItem {
  id: string
  label: string
  icon?: string
  count?: number
}

export interface TabHeaderProps {
  tabs: TabItem[]
  activeId: string
  setActiveId: (id: string) => void
  vertical?: boolean
}

type ObjectValues<T> = T[keyof T]

// ************ Table ***********

export interface ImportModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}
export interface ImportExportProps {
  importExport: {
    importUrl?: string
    exportUrl?: string
    paramsProps?: Record<string, string>
  }
  refetch?: () => void
  moduleName: string
  exportButton?: boolean
}
export type ColumnDataType = ObjectValues<typeof ColumnType> | ''

export interface ColumnDataField<T> {
  field: keyof T
  params?: any
  class?: string
  type?: ColumnDataType
  formatOptions?: FieldFormatOptions

  renderer?: (data: any) => ReactNode
}

export type Column<T> = {
  title: string
  sortField?: keyof T
  dataField: ColumnDataField<T>[]
  class?: string
  sortable?: boolean
  sortDirection?: 'asc' | 'desc'
  hidden?: boolean
}

export interface ViewConfig<T> {
  redirectUrl: (data: T) => string
  icon?: string
  className?: string
}
export interface Action<T = any> {
  label: string
  actionToPerform?: string
  icon?: string
  conditional?: Conditional<T>
  getNavigateUrl?: (data: T) => string
  className?: string
  renderer?: (row: any) => ReactNode
  viewConfig?: ViewConfig<T>
}

export interface Conditional<T> {
  field: keyof T
  condition: '!=' | '?' | 'include' | 'notInclude' | '==='
  conditionValue?: string[]
  actionLabel?: string
}

export interface ITableConfig<T = any> {
  columns: Column<T>[]
  actionsDropDown: (Action<T> | string)[]
  data: T[] | undefined
  total: number | undefined
  isColumnChooser?: boolean
}

export type TableConfig<T> = ITableConfig & {
  columns: Column<T>[]
  data: T[] | []
}

export interface TablePaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}

export interface TableSearchProps {
  term: string
  onSearch: (term: string) => void
  placeholder?: string
  debounceTime?: number
}

export interface ImportExportConfig {
  importUrl?: string
  exportUrl?: string
  paramsProps?: Record<string, string>
  moduleName?: string
  exportButton?: boolean
}

export interface TableWrapperProps {
  children: ReactNode
  // Table State Management
  pagination: TablePaginationProps
  search?: TableSearchProps
  // Import/Export
  importExportConfig?: ImportExportConfig
  activeTab?: string
  refetch?: () => void
  // Actions
  handleBulkActions?: (action: string, data: any[]) => void
  showDelete?: boolean
  // Customization
  customTopControls?: ReactNode
  customBottomControls?: ReactNode
  // Selection
  onSelectionChange?: (selectedRows: any[]) => void
}

export interface CommonPaginationProps {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  goToPage: (page: number) => void
  handleSetPageSize?: (size: number) => void
}

export interface TableClickedAction<T> {
  actionToPerform: string
  data: T | T[]
}

export interface FieldFormatOptions {
  // Common
  nullValue?: string

  timeZone?: string

  // Date/DateTime options
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  hour12?: boolean
  showSeconds?: boolean
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle']
  timeFormatOptions?: {
    hour?: 'numeric' | '2-digit'
    minute?: 'numeric' | '2-digit'
    second?: 'numeric' | '2-digit'
    hourCycle?: 'h11' | 'h12' | 'h23' | 'h24'
  }
  separator?: string

  // Date
  dateFormat?: string
  timeFormat?: string

  // Number
  decimalPlaces?: number
  thousandSeparator?: boolean

  // Currency
  currency?: string
  locale?: string

  // Boolean
  trueText?: string
  falseText?: string

  // Link
  baseUrl?: string
  newTab?: boolean
  linkText?: string

  // Status
  statusMap?: Record<string, string>
  statusSwitch?: {
    activeValue?: string | boolean | number
    inactiveValue?: string | boolean | number
    activeLabel?: string
    inactiveLabel?: string
    onChange?: (row: any, newStatus: boolean) => void
    className?: string
    size?: 'sm' | 'md' | 'lg'
    activeColor?: string
    inactiveColor?: string
    disabled?: boolean

    actionMap?: {
      deactivate: string
      activate: string
    }
  }
  length?: number
}

export interface CommonTableProps<T> {
  tableConfiguration: TableConfig<T>
  isRefetching?: boolean
  pagingDisabled?: boolean
  goToPage?: (val: number) => void
  handleSetPageSize?: (val: number) => void
  sort?: {
    toggleSort?: (col: { sortDirection: 'asc' | 'desc' }) => void
    onSort?: (field: keyof T) => void
  }
  onActionPerform?: any
  onSelectionChange?: (selectedRows: T[]) => void
  isLoading?: boolean
  searchText?: string
  setSearchText?: (state: string) => void
  handleSetSearch?: any
  customDataList?: string
  hasChecks?: boolean
  className?: string
}

export interface PerPageProps {
  itemsPerPage: number
  perPageValues?: number[]
  onChange: (value: number) => void
}
export interface ToolbarWithTabsAndSearchProps {
  // Tab Controls
  showTabs?: boolean
  tabItems?: TabItem[]
  activeTab?: string
  setActiveTab?: (id: string) => void

  // Search Controls
  showSearch?: boolean
  searchText?: string
  setSearchText?: (text: string) => void
  handleSetSearch?: (value: string) => void

  // Action Button Controls
  showActionButton?: boolean
  onActionClick?: () => void
  actionButtonLabel?: string
  actionButtonIconId?: string
}

//Accordion
export interface AccordionSectionProps {
  accordionId: string
  open: string | string[]
  toggle: (id: string) => void
  title: string
  subtitle: string
  children: ReactNode
}

// Modal

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  isLoading?: boolean

  // Content
  title?: string
  subtitle?: string
  confirmText?: string
  cancelText?: string

  // Style variants
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info'

  // Optional customizations
  iconId?: string
  showIcon?: boolean
  showCancelButton?: boolean
  loadingText?: string
}

export interface AcknowledgementModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  content: string | React.ReactNode
  okText?: string
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info'
  iconId?: string
  showIcon?: boolean
  isLoading?: boolean
  loadingText?: string
}

export interface ModalAction {
  text?: string
  title?: string
  onClick: () => void | Promise<void>
  color?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  autoClose?: boolean
  confirmRequired?: boolean
  confirmText?: string
  icon?: string
  iconClass?: string
  type?: 'button' | 'submit' | 'reset'
}

export interface SimpleModalProps {
  isOpen: boolean
  onClose: () => void
  subtitle?: string | ReactNode
  title?: string | ReactNode
  children: ReactNode
  actions?: ModalAction[]
  centered?: boolean
  scrollable?: boolean
  fullscreen?: boolean
  closable?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  autoFocus?: boolean
  returnFocusAfterClose?: boolean
  loading?: boolean
  loadingText?: string
  className?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  modalClassName?: string
  onOpened?: () => void
  onClosed?: () => void
  ariaLabel?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ariaDescribedBy?: string
  footerJustify?: 'start' | 'center' | 'end' | 'between' | 'around'
  fade?: boolean
  backdropTransition?: object
  modalTransition?: object
  titleTag?: keyof JSX.IntrinsicElements
}
export interface CommonModalProps {
  isOpen: boolean
  toggle: () => void
  title?: string | ReactNode
  subtitle?: string | ReactNode
  iconId?: string
  iconClassName?: string
  children?: ReactNode
  confirmButton?: {
    text: string
    color: string
    onClick: () => void
    isLoading?: boolean
    disabled?: boolean
  }
  cancelButton?: {
    text: string
    color: string
    onClick?: () => void
    disabled?: boolean
  }
  loaderClassName?: string
  footerContent?: ReactNode
  centered?: boolean
  className?: string
  modalBodyClassName?: string
  showHeader?: boolean
  showFooter?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Popover
export interface DynamicPopoverProps {
  trigger?: ReactNode
  children: ReactNode | ((opts: { closePopover: () => void }) => ReactNode)
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  popoverClassName?: string
  hideArrow?: boolean
  delay?: { show: number; hide: number }
  triggerType?: 'click' | 'hover'
  isOpen?: boolean
  toggle?: () => void
  onToggle?: (isOpen: boolean) => void
  closeOnScroll?: boolean
  style?: React.CSSProperties
}

// Tooltip
export interface HintProps {
  label: string
  children: ReactElement<HTMLAttributes<HTMLElement>>
  placement?: 'top' | 'bottom' | 'right' | 'left'
  forceOpen?: boolean
}

// Form field wrapper
export interface FormFieldWrapperProps {
  label?: string
  id?: string
  name?: string
  error?: string
  touched?: boolean
  helperText?: string
  layout?: 'horizontal' | 'vertical'
  children: ReactNode
  formGroupClass?: string
  labelClass?: string
  fieldColSize?: number
  labelColSize?: number
}

// Csv File Upload
export interface CsvFileUploadProps {
  name: string
  values: {
    [key: string]: File[] | string
  }
  setFieldValue: (field: string, value: any) => void
  errors?: FormikErrors<{
    [key: string]: any
  }>
}

// Radio input
interface RadioOption {
  label: string
  value: string
}

export interface RadioInputProps {
  name: string
  label?: string
  options: RadioOption[]
  formGroupClass?: string
  labelClass?: string
  wrapperClass?: string
}

// Radio with tag input
export interface RadioInputOption {
  value: string
  label: string
  showTagInput?: boolean
  checkboxAbove?: {
    name?: string
    label?: string
    show?: boolean
  }
  checkboxBelow?: {
    name?: string
    label?: string
    show?: boolean
  }
}
export interface RadioWithTagInputProps {
  name: string
  label: string
  radioOptions: RadioInputOption[]
  placeholder?: string
  onChange?: (val: string | string[]) => void
  layout?: 'vertical' | 'horizontal'
  helperText?: string
  formGroupClass?: string
}

// Tag input
export interface TagInputProps {
  name: string
  placeholder?: string
  className?: string
  label?: string
  layout?: 'horizontal' | 'vertical'
  helperText?: string
  formGroupClass?: string
  labelClass?: string
}

export interface GalleryMedia {
  src: string
  alt: string
  messageId?: ID
  fileName?: string | null
  type?: 'image' | 'video'
  fileType?: string | null
  originalFile?: any
}

export interface MediaGalleryProps {
  media: GalleryMedia[]
  initialIndex?: number
  onClose: () => void
  onSlideChange?: (index: number) => void
  className?: string
}

export interface ThreadPreviewProps {
  onClick?: () => void
  children: ReactNode
  showHeaderIcon?: boolean
  headerText?: string
  headerIconId?: string
  className?: string
  message?: {
    isFavorite?: boolean
    statuses?: Array<{ user_id?: string; status: string }>
    sender_id?: string
    isPinned?: boolean
  }
  isLastMessage?: boolean
  currentUserId?: string
}

export interface TriggerElementProps {
  ref?: ((node: HTMLElement | null) => void) | { current: HTMLElement | null }
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void
  onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
  className?: string
  [key: string]: unknown
}

export interface UserChannelOptionType {
  data: {
    id: ID
    type: string
    avatar: string | null
    profile_color?: string | null
    email?: string | null
  }
  label: string
  value: any
}
