import { LocationWiseUser, MostActiveUser, TeamGrowthMonthly, UserGrowthMonthly } from '../api'

export interface LocationWiseUsersProps {
  data: LocationWiseUser[]
}

export interface MostActiveUsersProps {
  data: MostActiveUser[]
}

export interface TeamGrowthBarChartProps {
  data: TeamGrowthMonthly[]
}

export interface UserGrowthChartProps {
  data: UserGrowthMonthly[]
}
