export interface MenuItem {
  title: string
  lanClass?: string
  Items?: MenuItem[]
  id?: number
  icon?: string
  type?: string
  active?: boolean
  menu?: MenuItem[]
  url?: string
  badge?: boolean
  badgeName?: string
  badgeColor?: string
}

export interface MenuSectionProps {
  section: MenuItem
}

export interface MenuListProps {
  menu: MenuItem[] | undefined
  setActiveMenu: (temp: MenuItem[]) => void
  activeMenu: MenuItem[]
  level: number
}

export interface MenuItem {
  title: string
  lanClass?: string
  Items?: MenuItem[]
  id?: number
  icon?: string
  type?: string
  active?: boolean
  menu?: MenuItem[]
  url?: string
  badge?: boolean
  badgeName?: string
  badgeColor?: string
}

export interface MenuSectionProps {
  section: MenuItem
}

export interface MenuListProps {
  menu: MenuItem[] | undefined
  setActiveMenu: (temp: MenuItem[]) => void
  activeMenu: MenuItem[]
  level: number
}
