import { FALLBACKS } from './fallback'
import { FEATURES } from './features'
import { HTTP_STATUS } from './httpStatus'
import { KEYS } from './keys'
import { ROUTES } from './routes'
import { SOCKET } from './socket'
import { STORAGE_KEYS } from './storageKeys'
import { URL_KEYS } from './url'
import { CHAT_CONSTANTS } from './web'

export const Href: string = '#'
export const ImagePath: string = '/assets/images'
export const ImageBaseUrl = import.meta.env.VITE_STORAGE_URL

export enum ChatType {
  Channel = 'channel',
  DM = 'dm',
}

export enum TeamRole {
  Admin = 'admin',
  User = 'user',
  Member = 'member',
}

export enum ChannelRole {
  Admin = 'admin',
  User = 'user',
  Member = 'member',
}

export enum UserAvailabilityStatus {
  Online = 'online',
  Offline = 'offline',
  Away = 'away',
}

export enum UserStatus {
  Active = 'active',
  Deactivated = 'deactive',
}

export enum UserTeamStatus {
  Active = 'active',
  Pending = 'pending',
  Deactivated = 'deactivated',
  Requested = 'requested',
  Rejected = 'rejected',
  Joined = 'joined',
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  File = 'file',
  Video = 'video',
  Audio = 'audio',
  Poll = 'poll',
  Form = 'form',
  System = 'system',
  Call = 'call',
  Location = 'location',
  Contact = 'contact',
  Sticker = 'sticker',
  Gif = 'gif',
  Voice = 'voice',
  Document = 'document',
  Link = 'link',
  Reminder = 'reminder',
}

export enum ColumnType {
  Text = 'text',
  Number = 'number',
  Amount = 'amount',
  Date = 'date',
  DateTime = 'datetime',
  Boolean = 'boolean',
  Percentage = 'percentage',
  TextProfile = 'text_profile',
  Link = 'link',
  Status = 'status',
  StatusSwitch = 'status_switch',
  Custom = 'custom',
}

/**
 * Canales principales que deben aparecer primero en las listas.
 * El índice en el array define el orden de prioridad.
 */
export const PRIORITY_CHANNELS: string[] = [
  'General',
  'Desarrollo',
  'Gerencia',
  'Comercial',
  'Marketing',
  'Legal',
  'Proyectos',
  'Sala 1',
  'Sala 2',
  'Sala 3',
  'Sala 4',
  'Descanso',
]

export { CHAT_CONSTANTS, FEATURES, FALLBACKS, HTTP_STATUS, KEYS, ROUTES, SOCKET, STORAGE_KEYS, URL_KEYS }
