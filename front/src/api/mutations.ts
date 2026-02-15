import { KEYS, URL_KEYS } from '../constants'
import {
  AccountPayload,
  AddMembersToChannelPayload,
  AddMembersToChannelResponse,
  CancelReminderPayload,
  CreateChannelResponse,
  CustomField,
  CustomFieldPayload,
  DoNotDisturbPayload,
  ExportCsvParams,
  ImportCsvResponse,
  InitiatePaymentPayload,
  InitiatePaymentResponse,
  MessagePayload,
  MuteChatPayload,
  PinConversationPayload,
  RemoveChannelMemberPayload,
  SetReminderPayload,
  SetupProfile,
  SetupProfileResponse,
  StartImpersonationPayload,
  StartImpersonationResponse,
  StopImpersonationResponse,
  SubscribePayload,
  SubscribeResponse,
  SubscriptionQuotePayload,
  SubscriptionQuoteResponse,
  TeamCreate,
  TeamCreateResponse,
  TeamSettingFormValues,
  UnmuteChatPayload,
  UpdateChannelResponse,
  UpdatePasswordPayload,
  UpdateProfileResponse,
  UpdateTeamResponse,
  VerifyPaymentPayload,
  VerifyPaymentResponse,
} from '../types'
import { ID } from '../types/common'
import {
  CancelSubscriptionResponse,
  PlanChangePayload,
  PlanChangePreviewResponse,
  PlanChangeResponse,
} from '../types/components/plan'
import del from './delete'
import { useApiPost } from './hooks'
import post from './post'
import put from './put'

const mutations = {
  // Auth
  useRequestForgotPassword: () =>
    useApiPost<{ email: string }, void>([KEYS.SEND_PASSWORD_EMAIL], (input) =>
      post(URL_KEYS.Auth.ForgotPassword, input),
    ),

  useVerifyOtp: () =>
    useApiPost<{ email: string | null; otp: string }, { showProfileScreen: boolean }>([KEYS.VERIFY_OTP], (input) =>
      post(URL_KEYS.Auth.VerifyOtp, input),
    ),

  useResendOtp: () =>
    useApiPost<{ email: string | null }, void>([KEYS.RESEND_OTP], (input) => post(URL_KEYS.Auth.ResendOtp, input)),

  useRequestNewLogin: () =>
    useApiPost<{ email: string }, void>([KEYS.CHECK_EMAIL], (input) => post(URL_KEYS.Auth.CheckEmail, input)),

  useResetPassword: () =>
    useApiPost<{ new_password: string | null; email: string | null; otp: string | null }, void>(
      [KEYS.RESET_PASSWORD],
      (input) => post(URL_KEYS.Auth.ResetPassword, input),
    ),

  // Team
  useTeamCreate: () =>
    useApiPost<TeamCreate, TeamCreateResponse>([KEYS.CREATE_TEAM], (input) => post(URL_KEYS.Team.CreateTeam, input)),

  useAddNewTeam: () =>
    useApiPost<{ team_name: string }, TeamCreateResponse>([KEYS.ADD_TEAM], (input) =>
      post(URL_KEYS.Team.AddTeam, input),
    ),

  useSetupProfile: () =>
    useApiPost<SetupProfile, SetupProfileResponse>([KEYS.SETUP_PROFILE], (input) =>
      put(URL_KEYS.Team.SetupProfile, input),
    ),

  useJoinTeam: () =>
    useApiPost<{ email: string; team_id: number }, { isProfileUpdated: boolean }>(
      [KEYS.JOIN_TEAM, KEYS.FIND_KEY],
      (input) => post(URL_KEYS.Team.JoinTeam, input),
    ),

  useInviteTeamMembers: () =>
    useApiPost<{ emails: string[] }, void>([KEYS.INVITE_MEMBERS], (input) =>
      post(URL_KEYS.Team.InviteTeamMembers, input),
    ),

  useChannelCreate: () =>
    useApiPost<{ name: string; description: string; type: string; member_ids?: number[] }, CreateChannelResponse>(
      [KEYS.CREATE_CHANNEL],
      (input) => post(URL_KEYS.Team.CreateChannel, input),
    ),

  //UserProfile
  useUpdateProfile: () =>
    useApiPost<AccountPayload | FormData, UpdateProfileResponse>([KEYS.USER_UPDATE, KEYS.USER], (input) =>
      put(URL_KEYS.Profile.UpdateDetails, input),
    ),

  useUpdatePassword: () =>
    useApiPost<UpdatePasswordPayload, { message: string }>([KEYS.PASSWORD_UPDATE], (input) =>
      put(URL_KEYS.Profile.UpdatePassword, input),
    ),

  useLogout: () =>
    useApiPost<void, { message: string }>([], () => post(URL_KEYS.Profile.Logout, undefined)),

  useLogoutFromAllDevices: () =>
    useApiPost<void, { message: string }>([], () => post(URL_KEYS.Profile.LogoutAllDevices, undefined)),

  //team-admin
  useTeamStatusUpdate: () =>
    useApiPost<{ user_id: number; action: string }, void>([KEYS.TEAM_STATUS, KEYS.ALL_USERS], (input) =>
      put(URL_KEYS.Team.TeamUpdateStatus, input),
    ),

  useCreateCustomField: () =>
    useApiPost<{ user_id: number; action: string }, void>([KEYS.CREATE_CUSTOM_FIELD], (input) =>
      post(URL_KEYS.Team.CreateCustomField, input),
    ),

  useDeleteCustomField: () =>
    useApiPost<{ id: ID }, void>([KEYS.DELETE_CUSTOM_FIELD, KEYS.GET_CUSTOM_FIELD], ({ id }) =>
      del(`${URL_KEYS.Team.DeleteCustomField}/${id}`),
    ),

  useDeleteTeamMember: () =>
    useApiPost([KEYS.DELETE_TEAM_MEMBER], (input: { ids: number[] }) => del(URL_KEYS.Team.DeleteTeamMember, input)),
  useCustomFieldUpdate: () =>
    useApiPost<CustomField, void>([KEYS.CUSTOM_FIELD_UPDATE], (input) =>
      put(`${URL_KEYS.Team.UpdateCustomField}/${input.id}`, input),
    ),

  useUpdateTeamSetting: () =>
    useApiPost<TeamSettingFormValues, void>([KEYS.TEAM_SETTING_UPDATE], (input) =>
      put(URL_KEYS.Team.UpdateTeamSetting, input),
    ),

  // Import and Export
  useImportCsv: (url: string) =>
    useApiPost<FormData, ImportCsvResponse>([KEYS.IMPORT_CSV], (formData) =>
      post<FormData, ImportCsvResponse>(url, formData),
    ),

  useExportCsv: (url: string) =>
    useApiPost<ExportCsvParams, Blob>([KEYS.EXPORT_CSV], (params) => post<ExportCsvParams, Blob>(url, params)),

  // Message
  useStartConversation: () =>
    useApiPost<MessagePayload, void>([KEYS.SEND_MESSAGE, KEYS.GET_ALL_FILES], (input) =>
      post(URL_KEYS.Chat.SendMessage, input),
    ),

  useAddReaction: () =>
    useApiPost<{ message_id: ID; emoji: { emoji: string } }, void>([KEYS.ADD_REACTION], (input) =>
      post(URL_KEYS.Chat.MessageReaction, { message_id: input.message_id, emoji: input.emoji.emoji }),
    ),

  useRemoveReaction: () =>
    useApiPost<{ message_id: ID; emoji: string }, void>([KEYS.REMOVE_REACTION], (input) =>
      del(URL_KEYS.Chat.MessageReaction, input),
    ),

  useEditMessage: () =>
    useApiPost<{ message_id: ID; content: string }, void>([KEYS.EDIT_MESSAGE], (input) =>
      post(URL_KEYS.Chat.EditMessage, input),
    ),

  useDeleteMessage: () =>
    useApiPost<{ id: ID }, void>([KEYS.DELETE_MESSAGE, KEYS.GET_ALL_FILES], ({ id }) =>
      del(`${URL_KEYS.Chat.DeleteMessage}/${id}`),
    ),

  usePinMessage: () =>
    useApiPost<{ message_id: ID }, void>([KEYS.PIN_MESSAGE, KEYS.SPECIAL_MESSAGES], (input) =>
      post(URL_KEYS.Chat.PinMessage, input),
    ),

  useUnpinMessage: () =>
    useApiPost<{ message_id: ID }, void>([KEYS.UNPIN_MESSAGE, KEYS.SPECIAL_MESSAGES], (input) =>
      post(URL_KEYS.Chat.UnpinMessage, input),
    ),

  useFavoriteMessage: () =>
    useApiPost<{ message_id: ID }, void>([KEYS.FAVORITE_MESSAGE, KEYS.SPECIAL_MESSAGES], (input) =>
      post(URL_KEYS.Chat.FavoriteMessage, input),
    ),

  useUnfavoriteMessage: () =>
    useApiPost<{ message_id: ID }, void>([KEYS.UNFAVORITE_MESSAGE, KEYS.SPECIAL_MESSAGES], (input) =>
      post(URL_KEYS.Chat.UnfavoriteMessage, input),
    ),

  // Chat
  usePinUnpinChat: () =>
    useApiPost<PinConversationPayload, void>([KEYS.PIN_CONVERSATION], (input) =>
      post(URL_KEYS.Chat.PinConversation, input),
    ),

  // Channel
  useRemoveMemberFromChannel: () =>
    useApiPost<RemoveChannelMemberPayload, void>([KEYS.REMOVE_CHANNEL_MEMBER], (input) =>
      del(URL_KEYS.Channel.RemoveChannelMember, input),
    ),

  useUpdateChannelMemberRole: () =>
    useApiPost<RemoveChannelMemberPayload, void>([KEYS.UPDATE_CHANNEL_ROLE], (input) =>
      post(URL_KEYS.Channel.UpdateChannelMemberRole, input),
    ),

  useLeaveChannel: () =>
    useApiPost<{ channel_id: string }, void>([KEYS.LEAVE_CHANNEL], (input) =>
      post(URL_KEYS.Channel.LeaveChannel, input),
    ),

  useLeaveTeam: () =>
    useApiPost<{ user_id: string; team_id: string }, void>([KEYS.LEAVE_TEAM], (input) =>
      post(URL_KEYS.Team.LeaveTeam, input),
    ),

  useUpdateTeam: () =>
    useApiPost<{ team_name: string } | FormData, UpdateTeamResponse>(
      [KEYS.TEAM_UPDATE, KEYS.GET_CURRENT_TEAM],
      (input) => put(URL_KEYS.Team.UpdateTeam, input),
    ),

  useUpdateChannel: () =>
    useApiPost<FormData, UpdateChannelResponse>([URL_KEYS.Channel.UpdateChannel, KEYS.GET_CONVERSATIONS], (input) => {
      const formData = input as FormData
      const id = formData.get('id') as string
      const url = URL_KEYS.Channel.UpdateChannel.replace(':id', id)
      return put<FormData, UpdateChannelResponse>(url, formData)
    }),

  useDeleteChannel: () =>
    useApiPost([KEYS.DELETE_CHANNEL], (input: { ids: number[] }) => del(URL_KEYS.Channel.DeleteChannel, input)),

  // Reminders
  useSetReminder: () =>
    useApiPost<SetReminderPayload, void>([KEYS.SET_REMINDER, KEYS.GET_REMINDERS], (input) =>
      post(URL_KEYS.Reminders.SetReminder, input),
    ),

  useCancelReminder: () =>
    useApiPost<CancelReminderPayload, void>([KEYS.CANCEL_REMINDER, KEYS.GET_REMINDERS], (input) =>
      post(URL_KEYS.Reminders.CancelReminder, input),
    ),

  useDeleteCompletedReminder: () =>
    useApiPost<{ id: ID }, void>([KEYS.DELETE_REMINDER, KEYS.GET_REMINDERS], ({ id }) =>
      del(`${URL_KEYS.Reminders.DeleteReminder}/${id}`),
    ),

  useAddMembersToChannel: () =>
    useApiPost<AddMembersToChannelPayload, AddMembersToChannelResponse>(
      [KEYS.ADD_CHANNEL_MEMBER, KEYS.GET_TEAM_CHANNELS, KEYS.GET_CONVERSATIONS],
      (input) => post(URL_KEYS.Channel.AddMemberToChannel, input),
    ),

  // Mute Chat
  useMuteChat: () =>
    useApiPost<MuteChatPayload, void>([KEYS.MUTE_CHAT, KEYS.GET_CONVERSATIONS], (input) =>
      post(URL_KEYS.Chat.MuteChat, input),
    ),

  useUnmuteChat: () =>
    useApiPost<UnmuteChatPayload, void>([KEYS.UNMUTE_CHAT, KEYS.GET_CONVERSATIONS], (input) =>
      post(URL_KEYS.Chat.UnmuteChat, input),
    ),

  useDoNotDisturb: () =>
    useApiPost<DoNotDisturbPayload, void>([KEYS.DO_NOT_DISTURB, KEYS.USER], (input) =>
      put(URL_KEYS.Team.DoNotDisturb, input),
    ),

  useUpdateCustomFields: () =>
    useApiPost<CustomFieldPayload, void>([KEYS.CUSTOM_FIELDS], (input) => put(URL_KEYS.Team.UserCustomFields, input)),

  // Payment
  useInitiatePayment: () =>
    useApiPost<InitiatePaymentPayload, InitiatePaymentResponse>([KEYS.INITIATE_PAYMENT], (input) =>
      post(URL_KEYS.Wallet.InitiatePayment, input),
    ),

  useVerifyPayment: () =>
    useApiPost<VerifyPaymentPayload, VerifyPaymentResponse>(
      [KEYS.VERIFY_PAYMENT, KEYS.WALLET, KEYS.WALLET_BALANCE, KEYS.WALLET_TRANSACTIONS],
      (input) => post(URL_KEYS.Wallet.VerifyPayment, input),
    ),
  useCalculateSubscription: () =>
    useApiPost<SubscriptionQuotePayload, SubscriptionQuoteResponse>([KEYS.SUBSCRIPTION_QUOTE], (input) =>
      post(URL_KEYS.Subscription.Calculate, input),
    ),
  useSubscribeToPlan: () =>
    useApiPost<SubscribePayload, SubscribeResponse>(
      [KEYS.SUBSCRIPTION_SUBSCRIBE, KEYS.CURRENT_SUBSCRIPTION],
      (input) => post(URL_KEYS.Subscription.Subscribe, input),
    ),

  useCancelSubscription: () =>
    useApiPost<{ id: ID }, CancelSubscriptionResponse>(
      [KEYS.CURRENT_SUBSCRIPTION, KEYS.SUBSCRIPTION_HISTORY],
      ({ id }) => put(URL_KEYS.Subscription.Cancel.replace(':id', String(id))),
    ),

  usePreviewPlanChange: () =>
    useApiPost<PlanChangePayload, PlanChangePreviewResponse>(
      [KEYS.SUBSCRIPTION_QUOTE],
      (input) => post(URL_KEYS.Subscription.PreviewChange, input),
    ),

  useChangePlan: () =>
    useApiPost<PlanChangePayload, PlanChangeResponse>(
      [KEYS.CURRENT_SUBSCRIPTION, KEYS.SUBSCRIPTION_HISTORY, KEYS.WALLET_BALANCE],
      (input) => post(URL_KEYS.Subscription.Change, input),
    ),

  // E2E Encryption
  useToggleE2E: () =>
    useApiPost<{ enabled: boolean }, { success: boolean; message: string; e2e_enabled: boolean }>(
      [KEYS.E2E_TOGGLE, KEYS.E2E_STATUS],
      (input) => post(URL_KEYS.E2E.Toggle, input),
    ),

  useSavePublicKey: () =>
    useApiPost<{ public_key: string }, { success: boolean; message: string }>(
      ['E2E_SAVE_KEY', KEYS.E2E_MY_KEY],
      (input) => post(URL_KEYS.E2E.SaveKey, input),
    ),

  useDeletePublicKey: () =>
    useApiPost<void, { success: boolean; message: string }>(
      ['E2E_DELETE_KEY', KEYS.E2E_MY_KEY],
      () => del(URL_KEYS.E2E.DeleteKey),
    ),

  // Impersonation
  useStartImpersonation: () =>
    useApiPost<StartImpersonationPayload, StartImpersonationResponse>(
      [KEYS.IMPERSONATION_STATUS, KEYS.USER],
      (input) => post(URL_KEYS.Impersonation.Start, input),
    ),

  useStopImpersonation: () =>
    useApiPost<void, StopImpersonationResponse>([KEYS.IMPERSONATION_STATUS, KEYS.USER], () =>
      post(URL_KEYS.Impersonation.Stop, undefined),
    ),
}

export default mutations
