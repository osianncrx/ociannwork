import { UseQueryOptions } from '@tanstack/react-query'
import { KEYS, URL_KEYS } from '../constants'
import {
  AccountResponse,
  AvailableUsersResponse,
  ChannelsResponse,
  CombinedErrorResponse,
  DashboardResponse,
  FAQListResponse,
  ImpersonationStatusResponse,
  MyTeamsResponse,
  PageListResponse,
  Params,
  PlanListResponse,
  SettingsResponse,
  TeamMemberResponse,
  TeamsResponse,
  UserListResponse,
} from '../types'
import get from './get'
import { useApiGet } from './hooks'

const queries = {
  useGetUserDetails: () => useApiGet<AccountResponse>([KEYS.USER], () => get(URL_KEYS.Profile.Details)),

  useGetDashboard: () => useApiGet<DashboardResponse>([KEYS.DASHBOARD], () => get(URL_KEYS.Teams.Dashboard)),

  useGetSettings: () =>
    useApiGet<SettingsResponse>([KEYS.SETTINGS], () => get(URL_KEYS.Settings.GetSettings), {
      staleTime: 1000 * 60 * 60,
    }),

  useGetUsers: (params: Params) =>
    useApiGet<UserListResponse>([KEYS.ALL_USERS, params], () => get(URL_KEYS.Users.GetAllUsers, params)),
  useGetTeams: (params: Params) =>
    useApiGet<TeamsResponse>([KEYS.ALL_TEAMS, params], () => get(URL_KEYS.Teams.GetAllTeams, params)),
  useGetChannels: (params: Params) =>
    useApiGet<ChannelsResponse>([KEYS.ALL_CHANNELS, params], () => get(URL_KEYS.Channels.GetAllChannels, params)),
  useGetTeamMembers: (params: Params, teamId?: string) =>
    useApiGet<TeamMemberResponse>([KEYS.TEAM_MEMBERS, params], () =>
      get(URL_KEYS.Teams.TeamMembers, params, teamId ? { 'X-Team-ID': teamId } : undefined),
    ),
  useGetFaqs: (params: Params) =>
    useApiGet<FAQListResponse>([KEYS.ALL_FAQS, params], () => get(URL_KEYS.FAQ.GetAllFaqs, params)),
  useGetPages: (params: Params) =>
    useApiGet<PageListResponse>([KEYS.ALL_PAGES, params], () => get(URL_KEYS.Page.GetAllPages, params)),
  useGetPlans: (params: Params) =>
    useApiGet<PlanListResponse>([KEYS.ALL_PLANS, params], () => get(URL_KEYS.Plan.GetAllPlans, params)),

  // Impersonation
  useGetAvailableUsersToImpersonate: (
    options?: Omit<UseQueryOptions<AvailableUsersResponse, CombinedErrorResponse, AvailableUsersResponse, unknown[]>, 'queryKey' | 'queryFn'>,
  ) =>
    useApiGet<AvailableUsersResponse>(
      [KEYS.IMPERSONATION_AVAILABLE_USERS],
      () => get(URL_KEYS.Impersonation.GetAvailableUsers),
      options,
    ),

  useGetImpersonationStatus: (
    options?: Omit<
      UseQueryOptions<ImpersonationStatusResponse, CombinedErrorResponse, ImpersonationStatusResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<ImpersonationStatusResponse>([KEYS.IMPERSONATION_STATUS], () => get(URL_KEYS.Impersonation.Status), options),

  useGetMyTeams: (
    options?: Omit<UseQueryOptions<MyTeamsResponse, CombinedErrorResponse, MyTeamsResponse, unknown[]>, 'queryKey' | 'queryFn'>,
  ) =>
    useApiGet<MyTeamsResponse>([KEYS.IMPERSONATION_MY_TEAMS], () => get(URL_KEYS.Impersonation.GetMyTeams), options),
}

export default queries
