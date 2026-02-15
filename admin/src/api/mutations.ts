import { KEYS, URL_KEYS } from '../constants'
import {
  AccountPayload,
  CreateFAQPayload,
  CreatePagePayload,
  CreatePlanPayload,
  ResetPasswordPayload,
  StartImpersonationPayload,
  StartImpersonationResponse,
  StopImpersonationResponse,
  UpdateChannelResponse,
  UpdateFAQPayload,
  UpdatePagePayload,
  UpdatePlanPayload,
  UpdatePasswordPayload,
  UpdateProfileResponse,
} from '../types'
import remove from './delete'
import { useApiPost } from './hooks'
import post from './post'
import put from './put'

const mutations = {
  useRequestForgotPassword: () =>
    useApiPost<{ email: string }, void>([KEYS.SEND_PASSWORD_EMAIL], (input) =>
      post(URL_KEYS.Auth.ForgotPassword, input),
    ),
  useVerifyOtp: () =>
    useApiPost<{ email: string | null; otp: string }, void>([KEYS.VERIFY_OTP], (input) =>
      post(URL_KEYS.Auth.VerifyOtp, input),
    ),
  useResendOtp: () =>
    useApiPost<{ email: string | null }, void>([KEYS.RESEND_OTP], (input) => post(URL_KEYS.Auth.ResendOtp, input)),
  useResetPassword: () =>
    useApiPost<ResetPasswordPayload, void>([KEYS.RESET_PASSWORD], (input) => post(URL_KEYS.Auth.ResetPassword, input)),
  useUpdateProfile: () =>
    useApiPost<AccountPayload | FormData, UpdateProfileResponse>(
      [KEYS.USER_UPDATE, KEYS.USER],
      (input: AccountPayload | FormData) => put(URL_KEYS.Profile.UpdateDetails, input),
    ),
  useUpdatePassword: () =>
    useApiPost<UpdatePasswordPayload, void>([KEYS.PASSWORD_UPDATE], (input) =>
      put(URL_KEYS.Profile.UpdatePassword, input),
    ),
  useUpdateSetting: () =>
    useApiPost<FormData, void>([KEYS.SETTINGS_UPDATE, KEYS.SETTINGS], (input) =>
      put(URL_KEYS.Settings.UpdateSettings, input),
    ),
  useDeleteUser: () =>
    useApiPost([KEYS.DELETE_USER, KEYS.ALL_USERS], (input: { ids: number[] }) =>
      remove(URL_KEYS.Users.DeleteUser, input),
    ),
  useDeleteTeam: () =>
    useApiPost([KEYS.DELETE_TEAM, KEYS.ALL_TEAMS], (input: { ids: number[] }) =>
      remove(URL_KEYS.Teams.DeleteTeam, input),
    ),
  useDeleteChannel: () =>
    useApiPost([KEYS.TEAM_DELETE_CHANNEL, KEYS.ALL_CHANNELS], (input: { ids: number[] }) =>
      remove(URL_KEYS.Channels.DeleteChannel, input),
    ),
  useDeleteTeamMember: () =>
    useApiPost([KEYS.DELETE_TEAM_MEMBER], (input: { teamId?: string; ids: number[] }) =>
      remove(URL_KEYS.Teams.DeleteTeamMember, input),
    ),
  useTeamStatusUpdate: (teamId: string) =>
    useApiPost([KEYS.TEAM_STATUS], (input: { user_id: number; action: string }) =>
      put(URL_KEYS.Teams.TeamUpdateStatus, { ...input, team_id: teamId }, { headers: { 'X-Team-ID': teamId } }),
    ),
  useUpdateUserStatus: () =>
    useApiPost([KEYS.UPDATE_USER_STATUS, KEYS.ALL_USERS], (input: { id: number; status: string }) => {
      const url = URL_KEYS.Users.UpdateUserStatus.replace(':id', `${input.id}`)
      return put(url, { id: input.id, status: input.status })
    }),
  useImportCsv: (url: string) =>
    useApiPost<FormData, any>([KEYS.IMPORT_CSV], (formData) => post<FormData, any>(url, formData)),
  useExportCsv: (url: string) =>
    useApiPost<Record<string, any>, Blob>([KEYS.EXPORT_CSV], (params) => post<Record<string, any>, Blob>(url, params)),
  useCreateFaq: () =>
    useApiPost<CreateFAQPayload, void>([KEYS.CREATE_FAQ, KEYS.ALL_FAQS], (input) =>
      post(URL_KEYS.FAQ.CreateFaq, input),
    ),
  useUpdateFaq: () =>
    useApiPost<{ id: number; data: UpdateFAQPayload }, void>([KEYS.UPDATE_FAQ, KEYS.ALL_FAQS], ({ id, data }) =>
      put(URL_KEYS.FAQ.UpdateFaq.replace(':id', id.toString()), data),
    ),
  useDeleteFaq: () =>
    useApiPost([KEYS.DELETE_FAQ, KEYS.ALL_FAQS], (input: { ids: number[] }) => remove(URL_KEYS.FAQ.DeleteFaq, input)),
  useUpdateFaqStatus: () =>
    useApiPost([KEYS.UPDATE_FAQ_STATUS, KEYS.ALL_FAQS], (input: { id: number; status: string }) => {
      return put(URL_KEYS.FAQ.UpdateFaqStatus.replace(':id', input?.id.toString()), { status: input?.status })
    }),
  useCreatePage: () =>
    useApiPost<CreatePagePayload, void>([KEYS.CREATE_PAGE, KEYS.ALL_PAGES], (input) =>
      post(URL_KEYS.Page.CreatePage, input),
    ),
  useUpdatePage: () =>
    useApiPost<{ id: number; data: UpdatePagePayload }, void>([KEYS.UPDATE_PAGE, KEYS.ALL_PAGES], ({ id, data }) =>
      put(URL_KEYS.Page.UpdatePage.replace(':id', id.toString()), data),
    ),
  useDeletePage: () =>
    useApiPost([KEYS.DELETE_PAGE, KEYS.ALL_PAGES], (input: { ids: number[] }) =>
      remove(URL_KEYS.Page.DeletePage, input),
    ),
  useUpdatePageStatus: () =>
    useApiPost([KEYS.UPDATE_PAGE_STATUS, KEYS.ALL_PAGES], (input: { id: number; status: string }) => {
      return put(URL_KEYS.Page.UpdatePageStatus.replace(':id', input?.id.toString()), { status: input?.status })
    }),
  useUpdateChannel: () =>
    useApiPost<FormData, UpdateChannelResponse>(
      [URL_KEYS.Channels.UpdateChannel, KEYS.ALL_CHANNELS],
      (input: FormData) => {
        const id = input.get('id') as string
        const url = URL_KEYS.Channels.UpdateChannel.replace(':id', id)
        return put(url, input)
      },
    ),
  useCreatePlan: () =>
    useApiPost<CreatePlanPayload, void>([KEYS.CREATE_PLAN, KEYS.ALL_PLANS], (input) =>
      post(URL_KEYS.Plan.CreatePlan, input),
    ),
  useUpdatePlan: () =>
    useApiPost<{ id: number; data: UpdatePlanPayload }, void>([KEYS.UPDATE_PLAN, KEYS.ALL_PLANS], ({ id, data }) =>
      put(URL_KEYS.Plan.UpdatePlan.replace(':id', id.toString()), data),
    ),
  useDeletePlan: () =>
    useApiPost([KEYS.DELETE_PLAN, KEYS.ALL_PLANS], (input: { ids: number[] }) =>
      remove(URL_KEYS.Plan.DeletePlan, input),
    ),
  useUpdatePlanStatus: () =>
    useApiPost([KEYS.UPDATE_PLAN_STATUS, KEYS.ALL_PLANS], (input: { id: number; status: string }) => {
      return put(URL_KEYS.Plan.UpdatePlanStatus.replace(':id', input?.id.toString()), { status: input?.status })
    }),
  useSetDefaultPlan: () =>
    useApiPost([KEYS.SET_DEFAULT_PLAN, KEYS.ALL_PLANS], (input: { id: number }) => {
      return put(URL_KEYS.Plan.SetDefaultPlan.replace(':id', input?.id.toString()), {})
    }),

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
