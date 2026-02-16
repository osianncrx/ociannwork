import { KEYS, URL_KEYS } from '../../constants'
import get from '../get'
import post from '../post'
import useApiGet from '../hooks/useApiGet'

// ========== Types ==========

export interface MarcaResponse {
  idMarca: number
  TipoMarca: number
  Fecha: string
  Hora: string
}

export interface JornadaResponse {
  ok: boolean
  fecha: string
  horasBrutas: string
  tiempoDescanso: string
  horasNetas: string
  segundosBrutos: number
  segundosDescanso: number
  segundosNetos: number
  estado: 'SIN_REGISTRO' | 'TRABAJANDO' | 'DESCANSANDO' | 'TERMINADO'
}

export interface DescansoResponse {
  ok: boolean
  descansos: number
  enDescanso: boolean
  tiempoDescanso: string
  descansoRestante: string
  segundosDescanso: number
  segundosRestante: number
}

export interface EmpleadoEstado {
  idUsuario: number
  Nombre: string
  Apellidos: string
  puesto: string
  estado: string
  horaEntrada: string | null
  ultimaMarca: string | null
  horasTrabajadas: string
  tiempoDescanso: string
}

export interface DashboardResponse {
  ok: boolean
  fecha: string
  empleados: EmpleadoEstado[]
  resumen: {
    trabajando: number
    descansando: number
    terminados: number
    sinRegistro: number
  }
}

export interface EmpleadoEstadoFecha {
  idUsuario: number
  nombre: string
  apellidos: string
  estado: string
  ultimaHora: string
  marcas: { hora: string; tipo: number; tipoTexto: string }[]
}

export interface SolicitudEdicion {
  id: number
  idMarca: number
  user_id: number
  Hora: string
  tipoSolicitud: string
  aprobado: number
  eliminado: boolean
  createdAt: string
  Usuario?: { name: string; apellidos: string }
}

export interface ProyectoResponse {
  idProyecto: number
  nombre: string
  descripcion: string
  team_id: number
  activo: boolean
}

export interface ExtraResponse {
  id: number
  team_id: number
  totalextras: number
  motivo: string
  user_id: number
  fecha: string
  aceptado: number
  Usuario?: { name: string; apellidos: string }
}

export interface ReporteRegistro {
  idUsuario: number
  Nombre: string
  Apellidos: string
  Fecha: string
  HorasTrabajadasDia: string
  TiempoDescanso: string
  TotalHorasUsuario: number
  HorasProyectosEspeciales: number
  TotalExtras: number
}

export interface CuentaBancariaResponse {
  idCuenta: number
  team_id: number
  user_id: number
  cuenta: string
  banca: string
  tipoCuenta: string
}

export interface AttendanceUser {
  id: number
  name: string
  email: string
  apellidos: string
  puesto: string
  fecha_entrada: string
  id_persona: number
  tipo_permiso_marcas: number
  firsttime: boolean
  es_super_admin_marcas: boolean
}

export interface DiaSinSalida {
  fecha: string
  entrada: string
  tieneSolicitud: boolean
}

export interface FeriadoResponse {
  id: number
  feriados: string
  pagado: boolean
}

export interface TeamsLogResponse {
  id: number
  team_id: number
  user_id: number
  tipoEvento: string
  mensaje: string
  exitoso: boolean
  createdAt: string
}

export interface CompanyStats {
  totalEmpleados: number
  trabajandoHoy: number
  horasPromedioHoy: number
}

// ========== Query Hooks ==========

export function useMarcasHoy(enabled = true) {
  return useApiGet<{ ok: boolean; marcas: MarcaResponse[] }>(
    [KEYS.ATT_MARCAS_HOY],
    () => post(URL_KEYS.Attendance.GetMarksToday, {}),
    { enabled }
  )
}

export function useMarcasList(params: { fecha?: string; fechaInicio?: string; fechaFin?: string }, enabled = true) {
  return useApiGet<{ ok: boolean; marcas: MarcaResponse[] }>(
    [KEYS.ATT_MARCAS_LIST, params.fecha, params.fechaInicio, params.fechaFin],
    () => post(URL_KEYS.Attendance.GetMarks, params),
    { enabled }
  )
}

export function useJornada(fecha?: string, enabled = true) {
  return useApiGet<JornadaResponse>(
    [KEYS.ATT_JORNADA, fecha],
    () => post(URL_KEYS.Attendance.GetWorkday, { fecha }),
    { enabled }
  )
}

export function useDescanso(enabled = true) {
  return useApiGet<DescansoResponse>(
    [KEYS.ATT_DESCANSO],
    () => post(URL_KEYS.Attendance.GetBreak, {}),
    { enabled }
  )
}

export function useEstadoEmpleados(idEmpresa?: number, enabled = true) {
  const params = idEmpresa ? `?idEmpresa=${idEmpresa}` : ''
  return useApiGet<DashboardResponse>(
    [KEYS.ATT_ESTADO_EMPLEADOS, idEmpresa],
    () => get(`${URL_KEYS.Attendance.EmployeeStatusDashboard}${params}`),
    { enabled, refetchInterval: 60000 }
  )
}

export function useEstadoPorFecha(fecha: string, idEmpresa?: number, enabled = true) {
  const params = new URLSearchParams({ fecha })
  if (idEmpresa) params.set('idEmpresa', String(idEmpresa))
  return useApiGet<{ success: boolean; fecha: string; data: EmpleadoEstadoFecha[] }>(
    [KEYS.ATT_ESTADO_FECHA, fecha, idEmpresa],
    () => get(`${URL_KEYS.Attendance.EmployeeStatusByDate}?${params.toString()}`),
    { enabled }
  )
}

export function useProyectos(enabled = true) {
  return useApiGet<{ ok: boolean; proyectos: ProyectoResponse[] }>(
    [KEYS.ATT_PROYECTOS],
    () => get(URL_KEYS.Attendance.ListProjects),
    { enabled }
  )
}

export function useUmbralProyectos(enabled = true) {
  return useApiGet<{ ok: boolean; alcanzado: boolean; segundosNetos: number }>(
    [KEYS.ATT_UMBRAL_PROYECTOS],
    () => post(URL_KEYS.Attendance.ProjectThreshold, {}),
    { enabled }
  )
}

export function useMisSolicitudes(enabled = true) {
  return useApiGet<{ ok: boolean; solicitudes: SolicitudEdicion[] }>(
    [KEYS.ATT_SOLICITUDES_MINE],
    () => post(URL_KEYS.Attendance.MyEditRequests, {}),
    { enabled }
  )
}

export function useTodasSolicitudes(enabled = true) {
  return useApiGet<{ ok: boolean; solicitudes: SolicitudEdicion[] }>(
    [KEYS.ATT_SOLICITUDES_ALL],
    () => post(URL_KEYS.Attendance.AllEditRequests, {}),
    { enabled }
  )
}

export function useDiasSinSalida(enabled = true) {
  return useApiGet<{ ok: boolean; dias: DiaSinSalida[] }>(
    [KEYS.ATT_DIAS_SIN_SALIDA],
    () => post(URL_KEYS.Attendance.MissingExitDays, {}),
    { enabled }
  )
}

export function useMisExtras(enabled = true) {
  return useApiGet<{ ok: boolean; extras: ExtraResponse[] }>(
    [KEYS.ATT_EXTRAS_MINE],
    () => post(URL_KEYS.Attendance.MyOvertime, {}),
    { enabled }
  )
}

export function useExtrasAceptadas(enabled = true) {
  return useApiGet<{ ok: boolean; extras: ExtraResponse[] }>(
    [KEYS.ATT_EXTRAS_ACCEPTED],
    () => post(URL_KEYS.Attendance.AcceptedOvertime, {}),
    { enabled }
  )
}

export function useTodasExtras(enabled = true) {
  return useApiGet<{ ok: boolean; extras: ExtraResponse[] }>(
    [KEYS.ATT_EXTRAS_ALL],
    () => post(URL_KEYS.Attendance.AllOvertime, {}),
    { enabled }
  )
}

export function useReporteAdmin(params: { fechaInicio: string; fechaFin: string; idUsuario?: number }, enabled = true) {
  return useApiGet<{ ok: boolean; registros: ReporteRegistro[]; resumen: Record<string, unknown> }>(
    [KEYS.ATT_REPORTE_ADMIN, params.fechaInicio, params.fechaFin, params.idUsuario],
    () => post(URL_KEYS.Attendance.AdminReport, params),
    { enabled }
  )
}

export function useMiReporte(params: { fechaInicio: string; fechaFin: string }, enabled = true) {
  return useApiGet<{ ok: boolean; registros: ReporteRegistro[]; resumen: Record<string, unknown> }>(
    [KEYS.ATT_REPORTE_MIO, params.fechaInicio, params.fechaFin],
    () => post(URL_KEYS.Attendance.MyReport, params),
    { enabled }
  )
}

export function useFeriados(enabled = true) {
  return useApiGet<{ ok: boolean; feriados: FeriadoResponse[] }>(
    [KEYS.ATT_FERIADOS],
    () => post(URL_KEYS.Attendance.GetHolidays, {}),
    { enabled }
  )
}

export function useEmpresas(enabled = true) {
  return useApiGet<{ ok: boolean; empresas: Array<{ id: number; name: string; slug: string; activo_marcas: boolean }> }>(
    [KEYS.ATT_EMPRESAS],
    () => get(URL_KEYS.Attendance.ListCompanies),
    { enabled }
  )
}

export function useEmpresaStats(id: number, enabled = true) {
  return useApiGet<{ ok: boolean; stats: CompanyStats }>(
    [KEYS.ATT_EMPRESA_STATS, id],
    () => get(URL_KEYS.Attendance.CompanyStats.replace(':id', String(id))),
    { enabled }
  )
}

export function useAttendanceUsers(enabled = true) {
  return useApiGet<{ ok: boolean; usuarios: AttendanceUser[] }>(
    [KEYS.ATT_USUARIOS],
    () => get(URL_KEYS.Attendance.ListAttendanceUsers),
    { enabled }
  )
}

export function useAttendanceUser(id: number, enabled = true) {
  return useApiGet<{ ok: boolean; usuario: AttendanceUser }>(
    [KEYS.ATT_USUARIO, id],
    () => get(URL_KEYS.Attendance.GetAttendanceUser.replace(':id', String(id))),
    { enabled }
  )
}

export function useCuentasBancarias(enabled = true) {
  return useApiGet<{ ok: boolean; cuentas: CuentaBancariaResponse[] }>(
    [KEYS.ATT_CUENTAS_BANCARIAS],
    () => get(URL_KEYS.Attendance.ListBankAccounts),
    { enabled }
  )
}

export function useTeamsLogs(enabled = true) {
  return useApiGet<{ ok: boolean; logs: TeamsLogResponse[] }>(
    [KEYS.ATT_TEAMS_LOGS],
    () => get(URL_KEYS.Attendance.GetTeamsLogs),
    { enabled }
  )
}
