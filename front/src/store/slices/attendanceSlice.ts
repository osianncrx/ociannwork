import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AttendanceMark {
  idMarca: number
  TipoMarca: number
  Hora: string
  Fecha?: string
}

export interface AttendanceState {
  marcasHoy: AttendanceMark[]
  estadoActual: 'SIN_REGISTRO' | 'TRABAJANDO' | 'DESCANSANDO' | 'TERMINADO'
  segundosTrabajados: number
  segundosDescanso: number
  segundosRestanteDescanso: number
  proyectoAbierto: {
    idMarcaProyecto: number
    idProyecto: number
    nombreProyecto: string
    horaEntrada: string
  } | null
  umbralAlcanzado: boolean
  currentTeamMarcas: number | null
}

const initialState: AttendanceState = {
  marcasHoy: [],
  estadoActual: 'SIN_REGISTRO',
  segundosTrabajados: 0,
  segundosDescanso: 0,
  segundosRestanteDescanso: 4200,
  proyectoAbierto: null,
  umbralAlcanzado: false,
  currentTeamMarcas: null,
}

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setMarcasHoy: (state, action: PayloadAction<AttendanceMark[]>) => {
      state.marcasHoy = action.payload
    },
    addMarca: (state, action: PayloadAction<AttendanceMark>) => {
      state.marcasHoy.push(action.payload)
    },
    setEstadoActual: (state, action: PayloadAction<AttendanceState['estadoActual']>) => {
      state.estadoActual = action.payload
    },
    setTiempos: (state, action: PayloadAction<{
      segundosTrabajados: number
      segundosDescanso: number
      segundosRestanteDescanso: number
    }>) => {
      state.segundosTrabajados = action.payload.segundosTrabajados
      state.segundosDescanso = action.payload.segundosDescanso
      state.segundosRestanteDescanso = action.payload.segundosRestanteDescanso
    },
    setProyectoAbierto: (state, action: PayloadAction<AttendanceState['proyectoAbierto']>) => {
      state.proyectoAbierto = action.payload
    },
    setUmbralAlcanzado: (state, action: PayloadAction<boolean>) => {
      state.umbralAlcanzado = action.payload
    },
    setCurrentTeamMarcas: (state, action: PayloadAction<number | null>) => {
      state.currentTeamMarcas = action.payload
    },
    resetAttendance: () => initialState,
  },
})

export const {
  setMarcasHoy,
  addMarca,
  setEstadoActual,
  setTiempos,
  setProyectoAbierto,
  setUmbralAlcanzado,
  setCurrentTeamMarcas,
  resetAttendance,
} = attendanceSlice.actions

export default attendanceSlice.reducer
