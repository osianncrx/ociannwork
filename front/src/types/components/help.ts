export interface HelpTabItem {
  id: string
  title: string
  slug: string
  dataId?: number
  content?: string
}

export interface PageItem extends HelpTabItem {
  content: string
  dataId: number
}

export interface HelpHeaderProps {
  activeTab: string
  setActiveTab: (id: string) => void
  tabArray: HelpTabItem[]
}

export interface PagesProps {
  data: PageItem
  isLoading: boolean
  isRefetching: boolean
}