# OciannWork

**Plataforma de colaboración en equipo con mensajería, llamadas, grabaciones e inteligencia artificial.**

OciannWork es un sistema completo de comunicación empresarial que permite a equipos de trabajo colaborar en tiempo real a través de mensajería, llamadas de audio y video, compartición de archivos, y análisis inteligente de reuniones impulsado por IA.

---

## Arquitectura

El proyecto se compone de tres módulos principales:

| Módulo | Directorio | Tecnología | Descripción |
|--------|-----------|------------|-------------|
| **Frontend** | `/front` | React 19 + TypeScript + Vite | Aplicación web principal para usuarios |
| **API** | `/api` | Node.js + Express 5 + Sequelize | Backend REST + WebSocket |
| **Admin** | `/admin` | React 19 + TypeScript + Vite | Panel de administración |

---

## Stack Tecnológico

### Frontend
- **React 19** con TypeScript
- **Vite** como bundler
- **Redux Toolkit** para manejo de estado
- **Socket.io Client** para comunicación en tiempo real
- **Bootstrap 5 + Reactstrap** para UI
- **Quill** como editor de texto enriquecido
- **ApexCharts** para gráficos
- **React Query (TanStack)** para caché de datos
- **Formik + Yup** para formularios y validación
- **i18next** para internacionalización

### Backend
- **Node.js + Express 5**
- **Sequelize ORM** con MySQL
- **Socket.io** para WebSockets
- **JWT** para autenticación
- **Multer** para carga de archivos
- **Node-cron** para tareas programadas
- **OpenAI SDK** para transcripción y análisis IA

### Base de Datos
- **MySQL** con Sequelize ORM

### Infraestructura
- **Nginx** como proxy inverso y servidor de archivos estáticos
- **PM2** para gestión de procesos Node.js
- **Let's Encrypt** para certificados SSL

---

## Funcionalidades Principales

### 1. Mensajería en Tiempo Real
- Mensajes directos (DM) entre usuarios
- Canales grupales con gestión de miembros
- Editor de texto enriquecido con formato
- Adjuntos de archivos (imágenes, videos, documentos)
- Reacciones a mensajes
- Mensajes fijados y favoritos
- Edición y eliminación de mensajes
- Búsqueda de mensajes
- Menciones (@usuario)
- Indicadores de escritura
- Confirmaciones de lectura (enviado, entregado, visto)
- Respuestas a mensajes
- Vista previa de enlaces
- Compartir ubicación
- Mensajes de audio

### 2. Llamadas de Audio y Video (WebRTC)
- Llamadas de audio individuales y grupales
- Videollamadas con soporte multi-participante
- Compartición de pantalla
- Controles de llamada (silenciar, activar/desactivar video)
- Notificaciones de llamada con tono
- Historial de llamadas
- Reconexión a llamadas activas
- Servidores TURN/STUN para conectividad
- Cifrado extremo a extremo (E2E)

### 3. Grabación de Llamadas
- Grabación automática al iniciar una llamada
- Soporte para audio y video
- Grabación de múltiples participantes con composición en canvas
- Grabación de pantalla compartida
- Carga y almacenamiento automático
- Reproductor integrado
- Página de detalle con enlace compartible
- Gestión de grabaciones (ver, descargar, eliminar)

### 4. Análisis de Reuniones con IA
- **Transcripción automática** del audio usando OpenAI Whisper
- **Resumen ejecutivo** con puntos clave y decisiones tomadas
- **Extracción de tareas** con asignación a participantes, prioridad y fecha límite
- **Análisis detallado**: efectividad, participación, tono, temas discutidos y recomendaciones
- Procesamiento automático al subir grabación o bajo demanda
- Página dedicada con pestañas: Reproductor, Resumen, Transcripción, Tareas, Análisis

### 5. Cifrado Extremo a Extremo (E2E)
- Cifrado E2E para mensajes
- Cifrado E2E para llamadas
- Gestión de claves públicas
- Intercambio seguro de claves
- Toggle de E2E a nivel de equipo

### 6. Gestión de Archivos
- Carga de archivos (imágenes, videos, documentos)
- Organización por carpetas de equipo
- Vista previa de archivos
- Búsqueda de archivos
- Límites de almacenamiento por plan

### 7. Recordatorios
- Crear, editar y eliminar recordatorios
- Recordatorios recurrentes
- Opciones rápidas de tiempo
- Selector de fecha/hora personalizado
- Notificaciones de recordatorios (cron)

### 8. Gestión de Usuarios
- Perfiles de usuario personalizables
- Campos personalizados de perfil
- Avatares y colores de perfil
- Estados de usuario (Activo, Desactivado, Rechazado)
- Directorio de usuarios
- Modo No Molestar (DND) con expiración

### 9. Equipos y Canales
- Soporte multi-equipo
- Creación e invitación de equipos
- Gestión de canales (crear, editar, eliminar)
- Roles y permisos (Admin / Miembro)
- Configuración de equipo
- Fijar y silenciar conversaciones

### 10. Notificaciones
- Notificaciones del navegador
- Notificaciones in-app
- Sonidos de notificación
- Tonos de llamada
- Preferencias de notificación configurables

### 11. Suscripciones y Pagos
- Planes de suscripción configurables
- Gestión de características por plan
- Sistema de billetera (wallet)
- Historial de transacciones y pagos
- Cancelación de suscripciones

### 12. Integraciones de Pago
- **Stripe**
- **PayPal**
- **Razorpay**
- Verificación de pagos y webhooks
- Soporte multi-moneda

---

## Panel de Administración

El panel de administración proporciona:

- **Dashboard** con analíticas y estadísticas
- **Gestión de usuarios**: ver, editar, activar/desactivar
- **Gestión de equipos**: monitoreo y administración
- **Gestión de canales**: supervisión de canales
- **Gestión de planes**: crear, editar, activar/desactivar planes de suscripción
- **FAQs**: crear y editar preguntas frecuentes
- **Páginas**: gestión de contenido (páginas de ayuda)
- **Configuración**: ajustes generales, email, modo mantenimiento
- **Impersonación**: super admin puede actuar como team admin o miembro
- **Widgets analíticos**: crecimiento de equipos, usuarios activos, distribución de mensajes, usuarios por ubicación

---

## Tareas Programadas (Cron Jobs)

| Tarea | Descripción |
|-------|-------------|
| Enviar recordatorios | Entrega recordatorios programados |
| Expirar silenciados | Remueve configuraciones de silencio expiradas |
| Expirar DND | Remueve el modo No Molestar expirado |
| Expirar suscripciones | Gestiona expiración de suscripciones |

---

## Modelos de Base de Datos

Users, Teams, Team Members, Channels, Channel Members, Messages, Message Reactions, Message Pins, Message Favorites, Message Status, Muted Chats, Reminders, Call Recordings, Plans, Team Subscriptions, Payments, Wallet, Wallet Transactions, Custom Fields, Settings, Team Settings, Channel Settings, FAQs, Pages, Sessions, OTP Logs, Pinned Conversations, Country Codes.

---

## Instalación y Configuración

### Requisitos
- Node.js 18+
- MySQL 8+
- Nginx
- PM2
- Certificado SSL (Let's Encrypt)

### Variables de Entorno

Cada módulo tiene su propio archivo `.env`:

**API** (`/api/.env`):
```
APP_NAME=OciannWork
PORT=3000
DB_HOST=localhost
DB_USERNAME=<usuario_db>
DB_PASSWORD=<password_db>
DB_DATABASE=<nombre_db>
JWT_SECRET=<secreto_jwt>
OPENAI_API_KEY=<api_key_openai>
STRIPE_SECRET_KEY=<stripe_key>
PAYPAL_CLIENT_ID=<paypal_id>
PAYPAL_CLIENT_SECRET=<paypal_secret>
```

**Frontend** (`/front/.env`):
```
VITE_API_BASE_URL=https://api.tudominio.com/api
VITE_SOCKET_URL=https://api.tudominio.com
VITE_STORAGE_URL=https://api.tudominio.com
```

### Instalación

```bash
# Clonar repositorio
git clone <url-del-repo>
cd ociannwork

# Instalar dependencias
cd api && npm install
cd ../front && npm install
cd ../admin && npm install

# Configurar base de datos
mysql -u root -p < schema.sql

# Construir frontend y admin
cd front && npm run build
cd ../admin && npm run build

# Iniciar API con PM2
cd ../api && pm2 start server.js --name ociannwork-api

# Configurar Nginx (ver configuración de ejemplo)
```

---

## Estructura del Proyecto

```
/
├── front/                  # Aplicación frontend (React + Vite)
│   ├── public/             # Assets estáticos
│   ├── src/
│   │   ├── api/            # Cliente HTTP (axios)
│   │   ├── components/     # Componentes React
│   │   ├── constants/      # Constantes y rutas
│   │   ├── layout/         # Layouts de la app
│   │   ├── pages/          # Páginas standalone
│   │   ├── services/       # Servicios (WebRTC, Recording, E2E)
│   │   ├── shared/         # Componentes compartidos
│   │   ├── store/          # Redux store y slices
│   │   ├── types/          # Tipos TypeScript
│   │   └── utils/          # Utilidades y hooks
│   └── dist/               # Build de producción
│
├── api/                    # Backend API (Node.js + Express)
│   ├── controllers/        # Controladores
│   ├── models/             # Modelos Sequelize
│   ├── routes/             # Rutas Express
│   ├── services/           # Servicios (AI, email, etc.)
│   ├── middlewares/        # Middleware (auth, etc.)
│   ├── public/             # Archivos públicos (recordings, uploads)
│   ├── views/              # Templates EJS
│   └── cron/               # Tareas programadas
│
├── admin/                  # Panel de administración (React + Vite)
│   ├── public/             # Assets estáticos
│   ├── src/
│   │   ├── api/            # Cliente HTTP
│   │   ├── components/     # Componentes del admin
│   │   ├── layout/         # Layout del admin
│   │   ├── pages/          # Páginas del admin
│   │   ├── shared/         # Componentes compartidos
│   │   └── store/          # Redux store
│   └── dist/               # Build de producción
│
└── README.md
```

---

## Licencia

Proyecto privado. Todos los derechos reservados - OciannWork.
