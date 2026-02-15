import { useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query'
import { ChatType, KEYS, URL_KEYS } from '../constants'
import {
  AccountResponse,
  AvailableUsersResponse,
  ChannelResponse,
  CombinedErrorResponse,
  CustomFieldListResponse,
  FAQListResponse,
  FindChannelResponse,
  FindTeamParams,
  FindTeamResponse,
  GetConversationsResponse,
  ImpersonationStatusResponse,
  MessagePageResponse,
  MutedChatsMap,
  MyTeamsResponse,
  PageListResponse,
  Params,
  PlanListResponse,
  PlanResponse,
  ReminderApiResponse,
  SearchMessagesPageResponse,
  SearchMessagesResponse,
  SearchParams,
  SettingsResponse,
  TeamDetailsResponse,
  TeamListResponse,
  TeamSettingResponse,
  TeamsResponse,
  WalletBalanceResponse,
  WalletResponse,
  WalletTransactionParams,
  WalletTransactionsResponse,
} from '../types'
import {
  CurrentSubscriptionResponse,
  SubscriptionHistoryParams,
  SubscriptionHistoryResponse,
} from '../types/components/plan'
import { ChatParams, Message, MessagesResponse } from '../types/common'
import { Reminder } from '../types'
import get from './get'
import { useApiGet } from './hooks'
import { DashboardResponse } from '../types/components/dashboard'

const queries = {
  // Wallet
  useGetWallet: () => useApiGet<WalletResponse>([KEYS.WALLET], () => get(URL_KEYS.Wallet.GetWallet)),
  useGetWalletBalance: () =>
    useApiGet<WalletBalanceResponse>([KEYS.WALLET_BALANCE], () => get(URL_KEYS.Wallet.GetWalletBalance)),
  useGetWalletTransactions: (params: WalletTransactionParams) =>
    useApiGet<WalletTransactionsResponse, WalletTransactionParams>([KEYS.WALLET_TRANSACTIONS, params], () =>
      get(URL_KEYS.Wallet.GetWalletTransactions, params),
    ),
  useGetPlans: (params?: Params) =>
    useApiGet<PlanListResponse, Params>([KEYS.PLANS, params], () => get(URL_KEYS.Plan.GetPlans, params)),
  useGetPlanBySlug: (
    slug: string,
    options?: Omit<
      UseQueryOptions<PlanResponse, CombinedErrorResponse, PlanResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<PlanResponse>([KEYS.PLAN_DETAILS, slug], () => get(URL_KEYS.Plan.GetPlanBySlug.replace(':slug', slug)), {
      enabled: !!slug,
      ...options,
    }),

  // Subscription
  useGetCurrentSubscription: (
    options?: Omit<
      UseQueryOptions<CurrentSubscriptionResponse, CombinedErrorResponse, CurrentSubscriptionResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<CurrentSubscriptionResponse>(
      [KEYS.CURRENT_SUBSCRIPTION],
      () => get(URL_KEYS.Subscription.Current),
      options,
    ),

  useGetSubscriptionHistory: (params?: SubscriptionHistoryParams) =>
    useApiGet<SubscriptionHistoryResponse, SubscriptionHistoryParams>([KEYS.SUBSCRIPTION_HISTORY, params], () =>
      get(URL_KEYS.Subscription.History, params),
    ),

  useGetFaqs: (params: Params) =>
    useApiGet<FAQListResponse>([KEYS.ALL_FAQS, params], () => get(URL_KEYS.FAQ.GetAllFaqs, params)),
  useGetPages: (params: Params) =>
    useApiGet<PageListResponse>([KEYS.ALL_PAGES, params], () => get(URL_KEYS.Page.GetAllPages, params)),
  useGetTeamList: () =>
    useApiGet<TeamListResponse>([KEYS.GET_TEAM], () => get(URL_KEYS.Team.TeamList), { enabled: false }),

  useGetDashboard: () => useApiGet<DashboardResponse>([KEYS.DASHBOARD], () => get(URL_KEYS.Team.Dashboard)),

  useGetFindTeam: (
    params?: FindTeamParams,
    options?: Omit<
      UseQueryOptions<FindTeamResponse, CombinedErrorResponse, FindTeamResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<FindTeamResponse, FindTeamParams>([KEYS.FIND_KEY, params], () => get(URL_KEYS.Team.FindTeam, params), {
      ...options,
    }),

  useGetSettings: (
    options?: Omit<
      UseQueryOptions<SettingsResponse, CombinedErrorResponse, SettingsResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) => useApiGet<SettingsResponse>([KEYS.SETTINGS], () => get(URL_KEYS.Settings.GetSettings), options),
  useGetPublicSettings: () =>
    useApiGet<SettingsResponse>([KEYS.PUBLIC_SETTINGS], () => get(URL_KEYS.Settings.GetPublicSettings)),

  useGetTeamMembersList: (
    params?: Params,
    options?: Omit<
      UseQueryOptions<TeamsResponse, CombinedErrorResponse, TeamsResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<TeamsResponse, Params>([KEYS.ALL_USERS, params], () => get(URL_KEYS.Team.GetAllTeamsMemberList, params), {
      ...options,
    }),

  useGetUserDetails: (
    options?: Omit<
      UseQueryOptions<AccountResponse, CombinedErrorResponse, AccountResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) => useApiGet<AccountResponse>([KEYS.USER], () => get(URL_KEYS.Profile.Details), options),

  useGetTeamDetails: (
    options?: Omit<
      UseQueryOptions<TeamDetailsResponse, CombinedErrorResponse, TeamDetailsResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) => useApiGet<TeamDetailsResponse>([KEYS.GET_CURRENT_TEAM], () => get(URL_KEYS.Team.CurrentTeam), options),

  useGetCustomFieldList: (params?: Params) =>
    useApiGet<CustomFieldListResponse>([KEYS.GET_CUSTOM_FIELD, params], () =>
      get(URL_KEYS.Team.GetAllCustomFieldList, params),
    ),
  useGetTeamSetting: (
    options?: Omit<
      UseQueryOptions<TeamSettingResponse, CombinedErrorResponse, TeamSettingResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) => useApiGet<TeamSettingResponse>([KEYS.TEAM_SETTING], () => get(URL_KEYS.Team.GetAllTeamSetting), options),

  // Chat

  useGetConversations: () =>
    useApiGet<GetConversationsResponse>([KEYS.GET_CONVERSATIONS], () =>
      get<GetConversationsResponse>(URL_KEYS.Chat.GetConversations),
    ),
  useGetMutedChats: () => useApiGet<MutedChatsMap>([KEYS.GET_MUTED_CHATS], () => get(URL_KEYS.Chat.GetMutedChats)),

  useGetChannelsByTeam: (
    params?: Params,
    options?: Omit<
      UseQueryOptions<ChannelResponse, CombinedErrorResponse, ChannelResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<ChannelResponse, Params>(
      [KEYS.GET_TEAM_CHANNELS, params],
      () => get(URL_KEYS.Chat.GetTeamChannels, params),
      {
        ...options,
      },
    ),
  useGetChannelById: (
    params?: Params,
    options?: Omit<
      UseQueryOptions<FindChannelResponse, CombinedErrorResponse, FindChannelResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<FindChannelResponse, Params>(
      [KEYS.GET_TEAM_CHANNELS, params],
      () => get((URL_KEYS.Channel.GetChannel as string).replace(':id', String(params?.id ?? '')), params),
      { ...options },
    ),
  useGetChannelMembers: (
    params?: Params,
    options?: Omit<
      UseQueryOptions<ChannelResponse, CombinedErrorResponse, ChannelResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<ChannelResponse, Params>(
      [KEYS.GET_CHANNEL_MEMBERS, params],
      () => get(URL_KEYS.Channel.GetChannelMembers, params),
      { ...options },
    ),

  useGetMessageById: (
    params?: Params,
    options?: Omit<
      UseQueryOptions<{ message: Message }, CombinedErrorResponse, { message: Message }, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<{ message: Message }, Params>(
      [KEYS.GET_MESSAGE_BY_ID, params],
      () => get((URL_KEYS.Chat.GetMessageById as string).replace(':id', String(params?.id ?? '')), params),
      options,
    ),

  useGetMessages: (
    params: Params,
    options?: Omit<
      UseQueryOptions<MessagesResponse, CombinedErrorResponse, MessagesResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<MessagesResponse, Params>(
      [KEYS.GET_MESSAGES, params],
      () =>
        get(URL_KEYS.Chat.GetMessages, {
          recipient_id: params?.type !== ChatType.Channel ? params?.id : null,
          channel_id: params?.type === ChatType.Channel ? params?.id : null,
        }),
      options,
    ),

  useGetMessagesInfinite: (chatParams: ChatParams) => {
    return useInfiniteQuery<MessagePageResponse, Error>({
      queryKey: ['messages', chatParams?.id, chatParams?.type],
      queryFn: async ({ pageParam = 0 }) => {
        const response = await get<MessagePageResponse>(URL_KEYS.Chat.GetMessages, {
          recipient_id: chatParams?.type !== ChatType.Channel ? chatParams?.id : null,
          channel_id: chatParams?.type === ChatType.Channel ? chatParams?.id : null,
          limit: 50,
          offset: pageParam as number,
          filter: chatParams.filter || null,
        })
        return {
          messages: response?.messages || [],
          nextOffset: response.nextOffset,
          hasMore: response.hasMore,
          isFirstPage: pageParam === 0,
          offset: pageParam as number,
          totalCount: response.totalCount,
          chat_type: response.chat_type,
          chat_id: response.chat_id,
          filter: response.filter,
        }
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.nextOffset : undefined
      },
      enabled: !!chatParams?.id,
      staleTime: 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
  },

  useGetSpecialMessagesInfinite: (chatParams: ChatParams) => {
    return useInfiniteQuery({
      queryKey: [KEYS.SPECIAL_MESSAGES, chatParams?.id, chatParams?.type],
      queryFn: async ({ pageParam = 0 }) => {
        const response: MessagePageResponse = await get(URL_KEYS.Chat.GetMessages, {
          recipient_id: chatParams?.type !== ChatType.Channel ? chatParams?.id : null,
          channel_id: chatParams?.type === ChatType.Channel ? chatParams?.id : null,
          limit: 2,
          offset: pageParam,
          filter: chatParams.filter || null,
        })

        return {
          messages: response?.messages || [],
          nextOffset: response.nextOffset,
          hasMore: response.hasMore,
          isFirstPage: pageParam === 0,
          offset: pageParam,
        }
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.nextOffset : undefined
      },
      enabled: !!chatParams?.id,
      staleTime: 5,
      // staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
  },

  useSearchMessages: (searchParams: SearchParams) => {
    return useInfiniteQuery<SearchMessagesPageResponse, Error>({
      queryKey: [
        KEYS.SEARCH_MESSAGES,
        searchParams?.query,
        searchParams?.scope,
        searchParams?.channel_id,
        searchParams?.recipient_id,
        searchParams?.sender_id,
      ],
      queryFn: async ({ pageParam = 0 }) => {
        const response = await get<SearchMessagesResponse>(URL_KEYS.Chat.SearchMessages, {
          query: searchParams?.query,
          scope: searchParams?.scope,
          channel_id: searchParams?.scope === ChatType.Channel ? searchParams?.channel_id : null,
          recipient_id: searchParams?.scope === ChatType.DM ? searchParams?.recipient_id : null,
          sender_id: searchParams?.sender_id || null,
          limit: searchParams?.limit || 20,
          offset: pageParam as number,
        })

        const pagination = response?.pagination || {}
        const currentOffset = pagination.offset || (pageParam as number)
        const limit = pagination.limit || searchParams?.limit || 20

        return {
          messages: response?.messages || [],
          nextOffset: currentOffset + limit,
          hasMore: pagination.hasMore || false,
          isFirstPage: pageParam === 0,
          offset: currentOffset,
          total: pagination.total || 0,
        }
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.nextOffset : undefined
      },
      enabled: !!searchParams?.query && searchParams?.query.length >= 1,
      staleTime: 5 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
  },

  useGetReminders: () =>
    useApiGet<Reminder[]>([KEYS.GET_REMINDERS], async () => {
      const response = await get<ReminderApiResponse>(URL_KEYS.Reminders.GetReminder)
      return response.data
    }),

  useGetAllFiles: (
    params: Params,
    options?: Omit<UseQueryOptions<ChatParams, CombinedErrorResponse, ChatParams, unknown[]>, 'queryKey' | 'queryFn'>,
  ) =>
    useApiGet<ChatParams>(
      [KEYS.GET_ALL_FILES, params],
      () =>
        get(URL_KEYS.Chat.GetAllFiles, {
          recipient_id: params?.type !== ChatType.Channel ? params?.id : null,
          channel_id: params?.type === ChatType.Channel ? params?.id : null,
          file_type: params?.file_type || null,
        }),
      { ...options },
    ),

  // E2E Encryption
  useGetE2EStatus: (
    options?: Omit<
      UseQueryOptions<
        { success: boolean; e2e_enabled: boolean },
        CombinedErrorResponse,
        { success: boolean; e2e_enabled: boolean },
        unknown[]
      >,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<{ success: boolean; e2e_enabled: boolean }>(
      [KEYS.E2E_STATUS],
      () => get(URL_KEYS.E2E.GetStatus),
      options,
    ),

  useGetMyPublicKey: (
    options?: Omit<
      UseQueryOptions<
        { success: boolean; public_key: string | null; has_encryption: boolean; e2e_enabled: boolean },
        CombinedErrorResponse,
        { success: boolean; public_key: string | null; has_encryption: boolean; e2e_enabled: boolean },
        unknown[]
      >,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<{ success: boolean; public_key: string | null; has_encryption: boolean; e2e_enabled: boolean }>(
      [KEYS.E2E_MY_KEY],
      () => get(URL_KEYS.E2E.GetMyKey),
      options,
    ),

  useGetUserPublicKey: (
    userId: string | number,
    options?: Omit<
      UseQueryOptions<
        {
          success: boolean
          user_id: number
          name: string
          public_key: string | null
          has_encryption: boolean
          e2e_enabled: boolean
        },
        CombinedErrorResponse,
        {
          success: boolean
          user_id: number
          name: string
          public_key: string | null
          has_encryption: boolean
          e2e_enabled: boolean
        },
        unknown[]
      >,
      'queryKey' | 'queryFn'
    >,
  ) =>
    useApiGet<{
      success: boolean
      user_id: number
      name: string
      public_key: string | null
      has_encryption: boolean
      e2e_enabled: boolean
    }>([KEYS.E2E_USER_KEY, userId], () => get(URL_KEYS.E2E.GetUserKey.replace(':user_id', String(userId))), {
      enabled: !!userId,
      ...options,
    }),

  // Impersonation
  useGetAvailableUsersToImpersonate: (
    options?: Omit<
      UseQueryOptions<AvailableUsersResponse, CombinedErrorResponse, AvailableUsersResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
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
    useApiGet<ImpersonationStatusResponse>(
      [KEYS.IMPERSONATION_STATUS],
      () => get(URL_KEYS.Impersonation.Status),
      options,
    ),

  useGetMyTeams: (
    options?: Omit<
      UseQueryOptions<MyTeamsResponse, CombinedErrorResponse, MyTeamsResponse, unknown[]>,
      'queryKey' | 'queryFn'
    >,
  ) => useApiGet<MyTeamsResponse>([KEYS.IMPERSONATION_MY_TEAMS], () => get(URL_KEYS.Impersonation.GetMyTeams), options),
}

export default queries
