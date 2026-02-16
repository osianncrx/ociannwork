import { KEYS, URL_KEYS } from '../../constants'
import post from '../post'
import useApiPost from '../hooks/useApiPost'
import apiClient from '../apiClient'

// ========== Mutation Hooks ==========

/** Register a new mark (entry/break/exit) */
export function useInsertMarca() {
  return useApiPost<
    { tipoMarca: number; hora: string },
    { ok: boolean; idMarca: number; hora: string }
  >(
    ['insert-marca', KEYS.ATT_MARCAS_HOY, KEYS.ATT_JORNADA, KEYS.ATT_DESCANSO, KEYS.ATT_ESTADO_EMPLEADOS],
    (data) => post(URL_KEYS.Attendance.InsertMark, data)
  )
}

/** Register retroactive exit */
export function useInsertExit() {
  return useApiPost<
    { fecha: string; hora: string },
    { ok: boolean; idMarca: number }
  >(
    ['insert-exit', KEYS.ATT_MARCAS_HOY, KEYS.ATT_JORNADA, KEYS.ATT_DIAS_SIN_SALIDA],
    (data) => post(URL_KEYS.Attendance.InsertExit, data)
  )
}

/** Request mark edit */
export function useEditMark() {
  return useApiPost<
    { idMarca: number; hora: string; tipoSolicitud: string },
    { ok: boolean; id: number }
  >(
    ['edit-marca', KEYS.ATT_SOLICITUDES_MINE],
    (data) => post(URL_KEYS.Attendance.EditMark, data)
  )
}

/** Approve mark edit */
export function useApproveMark() {
  return useApiPost<
    { id: number },
    { ok: boolean }
  >(
    ['approve-marca', KEYS.ATT_SOLICITUDES_ALL, KEYS.ATT_MARCAS_HOY],
    (data) => post(URL_KEYS.Attendance.ApproveMark, data)
  )
}

/** Reject mark edit */
export function useRejectMark() {
  return useApiPost<
    { id: number },
    { ok: boolean }
  >(
    ['reject-marca', KEYS.ATT_SOLICITUDES_ALL],
    (data) => post(URL_KEYS.Attendance.RejectMark, data)
  )
}

/** Request missing exit */
export function useRequestMissingExit() {
  return useApiPost<
    { fecha: string; hora: string },
    { ok: boolean }
  >(
    ['request-missing-exit', KEYS.ATT_DIAS_SIN_SALIDA, KEYS.ATT_SOLICITUDES_MINE],
    (data) => post(URL_KEYS.Attendance.RequestMissingExit, data)
  )
}

/** Create project */
export function useCreateProject() {
  return useApiPost<
    { nombre: string; descripcion?: string },
    { ok: boolean; idProyecto: number }
  >(
    ['create-proyecto', KEYS.ATT_PROYECTOS],
    (data) => post(URL_KEYS.Attendance.CreateProject, data)
  )
}

/** Update project */
export function useUpdateProject() {
  return useApiPost<
    { id: number; nombre?: string; descripcion?: string; activo?: boolean },
    { ok: boolean }
  >(
    ['update-proyecto', KEYS.ATT_PROYECTOS],
    async (data) => {
      const { id, ...body } = data
      const res = await apiClient.put(URL_KEYS.Attendance.UpdateProject.replace(':id', String(id)), body)
      return res.data
    }
  )
}

/** Delete project */
export function useDeleteProject() {
  return useApiPost<
    { id: number },
    { ok: boolean }
  >(
    ['delete-proyecto', KEYS.ATT_PROYECTOS],
    async (data) => {
      const res = await apiClient.delete(URL_KEYS.Attendance.DeleteProject.replace(':id', String(data.id)))
      return res.data
    }
  )
}

/** Insert project mark (entry/exit) */
export function useProjectMark() {
  return useApiPost<
    { idProyecto: number; tipo: 'entrada' | 'salida'; reporte?: string },
    { ok: boolean }
  >(
    ['project-mark', KEYS.ATT_PROYECTOS, KEYS.ATT_UMBRAL_PROYECTOS],
    (data) => post(URL_KEYS.Attendance.ProjectMark, data)
  )
}

/** Request overtime */
export function useRequestOvertime() {
  return useApiPost<
    { totalextras: number; motivo: string; fecha: string },
    { ok: boolean; id: number }
  >(
    ['request-overtime', KEYS.ATT_EXTRAS_MINE],
    (data) => post(URL_KEYS.Attendance.RequestOvertime, data)
  )
}

/** Approve/reject overtime */
export function useApproveOvertime() {
  return useApiPost<
    { id: number; aceptado: number },
    { ok: boolean }
  >(
    ['approve-overtime', KEYS.ATT_EXTRAS_ALL, KEYS.ATT_EXTRAS_MINE],
    (data) => post(URL_KEYS.Attendance.ApproveOvertime, data)
  )
}

/** Create attendance user */
export function useCreateAttendanceUser() {
  return useApiPost<
    Partial<{ name: string; email: string; apellidos: string; puesto: string; id_persona: number; tipo_permiso_marcas: number; password: string }>,
    { ok: boolean; id: number }
  >(
    ['create-att-user', KEYS.ATT_USUARIOS],
    (data) => post(URL_KEYS.Attendance.CreateAttendanceUser, data)
  )
}

/** Update attendance user */
export function useUpdateAttendanceUser() {
  return useApiPost<
    { id: number; [key: string]: unknown },
    { ok: boolean }
  >(
    ['update-att-user', KEYS.ATT_USUARIOS],
    async (data) => {
      const { id, ...body } = data
      const res = await apiClient.put(URL_KEYS.Attendance.UpdateAttendanceUser.replace(':id', String(id)), body)
      return res.data
    }
  )
}

/** Register bank account */
export function useRegisterBankAccount() {
  return useApiPost<
    { cuenta: string; banca: string; tipoCuenta: string },
    { ok: boolean; idCuenta: number }
  >(
    ['register-bank', KEYS.ATT_CUENTAS_BANCARIAS],
    (data) => post(URL_KEYS.Attendance.RegisterBankAccount, data)
  )
}

/** Create company (extends Team) */
export function useCreateCompany() {
  return useApiPost<
    { name: string; slug?: string; teams_webhook_url?: string },
    { ok: boolean; id: number }
  >(
    ['create-company', KEYS.ATT_EMPRESAS],
    (data) => post(URL_KEYS.Attendance.CreateCompany, data)
  )
}

/** Update company */
export function useUpdateCompany() {
  return useApiPost<
    { id: number; [key: string]: unknown },
    { ok: boolean }
  >(
    ['update-company', KEYS.ATT_EMPRESAS],
    async (data) => {
      const { id, ...body } = data
      const res = await apiClient.put(URL_KEYS.Attendance.UpdateCompany.replace(':id', String(id)), body)
      return res.data
    }
  )
}

/** Test Teams webhook */
export function useTestTeamsWebhook() {
  return useApiPost<
    Record<string, never>,
    { ok: boolean; message: string }
  >(
    ['test-webhook'],
    () => post(URL_KEYS.Attendance.TestTeamsWebhook, {})
  )
}

/** Send Teams report */
export function useSendTeamsReport() {
  return useApiPost<
    Record<string, never>,
    { ok: boolean }
  >(
    ['send-teams-report', KEYS.ATT_TEAMS_LOGS],
    () => post(URL_KEYS.Attendance.SendTeamsReport, {})
  )
}
