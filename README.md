# BookingApp 📅

> **Plataforma SaaS de reservas multi-tenant** para peluquerías, gimnasios, clínicas y espacios de coworking.

![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-10.0-7C3AED?style=flat-square&logo=dotnet)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)

---

## ✨ Características principales

- 🏢 **Multi-tenant** — cada negocio tiene su subdominio y datos aislados
- 🔐 **Autenticación JWT** con roles granulares: SuperAdmin, Owner, Staff, Client
- 📅 **Calendario visual** interactivo (vista diaria, semanal y mensual)
- 🌐 **Página pública** de reservas sin necesidad de cuenta
- 🔔 **Notificaciones en tiempo real** via SignalR (WebSockets)
- 📊 **Dashboard** con KPIs, gráficas y análisis de rendimiento
- 📤 **Exportación** a Excel y PDF con estadísticas detalladas
- 💳 **Pagos integrados** con Stripe (modo test)
- 📧 **Email reminders** automáticos con Hangfire
- 🐳 **Docker** — completamente contenedorizado

---

## 🚀 Demo rápida

| URL | Descripción |
|-----|-------------|
| `http://localhost:5173` | Aplicación web (Frontend) |
| `http://localhost:5173/book/:subdomain` | Página pública de reservas |
| `http://localhost:5239/scalar/v1` | Documentación API (Scalar) |
| `http://localhost:5239/hangfire` | Panel de jobs en background |

---

## 🛠️ Stack tecnológico

### Backend
| Tecnología | Uso |
|-----------|-----|
| ASP.NET Core 10 | Framework principal REST API |
| Entity Framework Core | ORM + migraciones |
| PostgreSQL 16 | Base de datos principal |
| SignalR | Notificaciones en tiempo real |
| Hangfire | Jobs en background (emails) |
| JWT Bearer | Autenticación y autorización |
| BCrypt.Net | Hash seguro de contraseñas |
| Stripe.net | Integración de pagos |
| ClosedXML | Exportación Excel |
| QuestPDF | Generación de PDFs |

### Frontend
| Tecnología | Uso |
|-----------|-----|
| React 18 + TypeScript | Framework UI |
| Vite | Build tool |
| Tailwind CSS v4 | Estilos |
| Shadcn/ui | Componentes accesibles |
| TanStack Query | Estado del servidor |
| React Router v6 | Enrutamiento SPA |
| Recharts | Gráficas y visualizaciones |
| FullCalendar | Calendario interactivo |
| Microsoft SignalR | Cliente WebSockets |

---

## 📁 Estructura del proyecto

```
BookingApp/
├── src/
│   ├── BookingApp.Domain/          # Entidades y Enums
│   ├── BookingApp.Application/     # Interfaces y DTOs
│   ├── BookingApp.Infrastructure/  # EF Core, Servicios, SignalR
│   ├── BookingApp.API/             # Controllers, Hubs, Program.cs
│   └── Booking.Frontend/           # React + TypeScript + Vite
├── tests/
│   └── BookingApp.Tests/           # Tests unitarios xUnit
├── docker-compose.yml
├── Dockerfile
└── BookingApp.slnx
```

---

## ⚡ Instalación y ejecución local

### Requisitos previos
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### 1. Clonar el repositorio
```bash
git clone https://github.com/ANASSELMORABIT/BookingApp.git
cd BookingApp
```

### 2. Levantar la base de datos
```bash
docker-compose up -d
```

### 3. Aplicar migraciones
```bash
dotnet ef database update --project src\BookingApp.Infrastructure --startup-project src\BookingApp.API
```

### 4. Arrancar el backend
```bash
dotnet run --project src\BookingApp.API
```

### 5. Arrancar el frontend
```bash
cd src\Booking.Frontend
npm install
npm run dev
```

### 6. Abrir en el navegador
```
http://localhost:5173
```

---

## 🔑 Credenciales de prueba

| Rol | Email | Contraseña | Subdominio |
|-----|-------|-----------|-----------|
| Owner | carlos@test.com | Password123! | mi-peluqueria |
| SuperAdmin | superadmin@bookingapp.com | Admin123! | superadmin |

---

## 🐳 Docker

```bash
# Levantar todo en producción
docker-compose up --build -d

# Ver logs de la API
docker logs bookingapp_api

# Conectarse a PostgreSQL
docker exec -it bookingapp_db psql -U booking_user -d bookingapp

# Parar todos los servicios
docker-compose down
```

---

## 🔌 API Endpoints principales

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/Auth/register` | Público | Registro de usuario |
| POST | `/api/Auth/login` | Público | Login + JWT |
| GET | `/api/Profile` | JWT | Ver perfil |
| GET | `/api/Business` | JWT | Listar negocios |
| POST | `/api/Business` | Owner | Crear negocio |
| GET | `/api/Availability` | Público | Slots disponibles |
| POST | `/api/Bookings` | JWT | Crear reserva |
| GET | `/api/Admin/dashboard` | Owner | Estadísticas |
| GET | `/api/Export/excel` | Owner | Exportar Excel |
| GET | `/api/Export/pdf` | Owner | Exportar PDF |
| GET | `/api/public/business/:subdomain` | Público | Info pública |
| POST | `/api/public/book` | Público | Reserva sin cuenta |
| WS | `/hubs/notifications` | JWT | Notificaciones |

---

## 🧪 Tests

```bash
dotnet test
```

Tests incluidos:
- `Booking_OverlapsWith_ShouldReturnTrue_WhenOverlapping`
- `Booking_OverlapsWith_ShouldReturnFalse_WhenNotOverlapping`
- `Booking_Cancel_ShouldChangeStatus_ToCancelled`

---

## 📄 Documentación

Consulta el archivo [`BookingApp_Documentation.pdf`](./BookingApp_Documentation.pdf) para la documentación técnica completa del proyecto.

---

## 👤 Autor

**Anass El Morabit**
- GitHub: [@ANASSELMORABIT](https://github.com/ANASSELMORABIT)

---

## 📝 Licencia

Este proyecto es de uso educativo y portfolio. Todos los derechos reservados © 2026 Anass El Morabit.
