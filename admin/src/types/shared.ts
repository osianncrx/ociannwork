import { FormikErrors, FormikHelpers } from 'formik'
import { ButtonHTMLAttributes, HTMLAttributes, ImgHTMLAttributes, MouseEventHandler, ReactNode, JSX } from 'react'
import { Props as SelectProps } from 'react-select'
import { Card, CardBody, CardFooter, CardHeader, InputProps } from 'reactstrap'
import { FormatOptions } from './utils'
import { COLUMN_TYPE } from './constants'
import type { DecoupledEditor as DecoupledEditorType } from '@ckeditor/ckeditor5-editor-decoupled'
import type { CKEditor as CKEditorType } from '@ckeditor/ckeditor5-react'
import { SingleUser } from './api'

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
    headerChildren?: React.ReactNode
  }
  footer?: {
    content: React.ReactNode
  }
  children?: React.ReactNode
  cardProps?: React.ComponentProps<typeof Card>
  headerProps?: React.ComponentProps<typeof CardHeader>
  bodyProps?: React.ComponentProps<typeof CardBody>
  footerProps?: React.ComponentProps<typeof CardFooter>
  backBtn?: boolean
}

// ************ Form/Input Fields ***********

export interface TextInputProps extends InputProps {
  label?: string
  name: string
  iconProps?: SvgProps
  children?: ReactNode
  containerClass?: string
  onlyNumeric?: boolean
  allowDecimal?: boolean
}
export type PhoneInputGroupProps = {
  label?: string
  name: string
  codeName: string
  containerClass?: string
  xxlClass?: number
  xxlClass2?: number
  user?: SingleUser
}

export interface MediaInputProps {
  name: string
  label: string
  type?: 'image' | 'video'
  description?: string
  className?: string
  accept?: string
  size?: string
}

export interface OptionType {
  label: string
  value: string | number
}

export interface SearchableSelectProps extends Partial<SelectProps<OptionType>> {
  options: OptionType[]
  value: OptionType | null
  onChange: (selected: OptionType | null | any) => void
  placeholder?: string
  isClearable?: boolean
}

export interface OtpInputProps {
  val: string[]
  setVal: (val: string[]) => void
  submitForm?: (values: { otp: string }, formikHelpers: FormikHelpers<{ otp: string }>) => void
}

export interface SwitchInputProps {
  name: string
  id?: string
  label?: string
  iconProps?: SvgProps
  containerClass?: string
  formgroupclass?: string
  labelclass?: string
  onToggle?: (checked: boolean) => void
  disabled?: boolean
  helperText?: string
  layout?: 'horizontal' | 'vertical'
  formGroupClass?: string
  checked?: boolean
  labelClass?: string
}

// ************ Images ***********
export interface AvatarProps {
  data?: {
    avatar?: string
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
}

export type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: any
  baseUrl?: string
  fallbackSrc?: string
}

// ************ Svg's ***********

export interface SvgProps {
  iconId: string | undefined
  className?: string
  style?: {
    height?: number
    width?: number
    fill?: string
    marginRight?: number
  }
  onClick?: () => void
}

// ************ Tabs ***********

interface TabItem {
  id: string
  label: string
  icon?: string
}

export interface TabHeaderProps {
  tabs: TabItem[]
  activeId: string
  setActiveId: (id: string) => void
}

type ObjectValues<T> = T[keyof T]

// ************ Table ***********
export interface ColumnDataField<T> {
  field: keyof T
  params?: any
  class?: string
  type?: ColumnDataType
  renderer?: (data: any) => ReactNode
  onToggle?: (row: T) => void
  checkCondition?: (val: any, row: T) => boolean
  dateformatOptions?: FormatOptions
  formatOptions?: any
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

export interface TablePaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
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
  setSearchText?: any
  handleSetSearch?: any
  customDataList?: string
}

export interface PerPageProps {
  itemsPerPage: number
  perPageValues?: number[]
  onChange: (value: number) => void
}

export type ColumnDataType = ObjectValues<typeof COLUMN_TYPE> | ''

export type Column<T> = {
  title: string
  sortField?: keyof T
  dataField: ColumnDataField<T>[]
  class?: string
  sortable?: boolean
  sortDirection?: 'asc' | 'desc'
  hidden?: boolean
}

export type TableConfig<T> = ITableConfig & {
  columns: Column<T>[]
  data: T[] | []
}

export interface TableSearchProps {
  term: string
  onSearch: (term: string) => void
  placeholder?: string
  debounceTime?: number
}

export interface TableWrapperProps {
  children: ReactNode
  pagination: TablePaginationProps
  search?: TableSearchProps
  activeTab?: string
  refetch?: () => void
  handleBulkActions?: (action: string, data: any[]) => void
  showDelete?: boolean
  customTopControls?: ReactNode
  customBottomControls?: ReactNode
  onSelectionChange?: (selectedRows: any[]) => void
}

export interface FieldFormatOptions {
  nullValue?: string
  timeZone?: string
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
  dateFormat?: string
  timeFormat?: string
  decimalPlaces?: number
  thousandSeparator?: boolean
  currency?: string
  locale?: string
  trueText?: string
  falseText?: string
  baseUrl?: string
  newTab?: boolean
  linkText?: string
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

export interface ToolbarWithTabsAndSearchProps {
  showTabs?: boolean
  tabItems?: TabItem[]
  activeTab?: string
  setActiveTab?: (id: string) => void
  showSearch?: boolean
  searchText?: string
  setSearchText?: (text: string) => void
  handleSetSearch?: (value: string) => void
  showActionButton?: boolean
  onActionClick?: () => void
  actionButtonLabel?: string
  actionButtonIconId?: string
}

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

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  title?: string
  subtitle?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info'
  iconId?: string
  showIcon?: boolean
  showCancelButton?: boolean
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
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
  ariaDescribedBy?: string
  footerJustify?: 'start' | 'center' | 'end' | 'between' | 'around'
  fade?: boolean
  backdropTransition?: object
  modalTransition?: object
  titleTag?: keyof JSX.IntrinsicElements
}

export interface CkEditorProps {
  onChange: (data: string) => void
  editorLoaded: boolean
  name: string
  value: string
  label?: string
  placeholder?: string
  error?: string
  touched?: boolean
}

export interface EditorModules {
  CKEditor: typeof CKEditorType
  DecoupledEditor: typeof DecoupledEditorType
}

export interface FormFieldWrapperProps {
  label?: string
  id?: string
  name?: string
  error?: string
  touched?: boolean
  helperText?: string
  layout?: 'horizontal' | 'vertical'
  labelclass?: string
  formgroupclass?: string
  children: ReactNode
}
