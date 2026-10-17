# BookingApp

Plataforma de reservas multi-tenant para negocios de servicios (peluquerías, gimnasios, clínicas, coworkings). Cada negocio gestiona sus locales, empleados, servicios y citas, y publica una página de reserva para que sus clientes reserven sin crear cuenta.

API REST en **ASP.NET Core (.NET 10)** con **EF Core + PostgreSQL**, y SPA en **React + TypeScript**. Proyecto personal de portfolio.

[![CI](https://github.com/ANASSELMORABIT/BookingApp/actions/workflows/ci.yml/badge.svg)](https://github.com/ANASSELMORABIT/BookingApp/actions/workflows/ci.yml)
![.NET](https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)

---

## Funcionalidades

**Implementadas**

- **Multi-tenant**: cada negocio es un tenant identificado por un *slug* (p. ej. `mi-peluqueria`). El `tenant_id` viaja en el JWT; los servicios comprueban que negocios, servicios, empleados y reservas pertenecen al tenant del usuario, y el hub de SignalR asigna los grupos en el servidor a partir de los claims.
- **Autenticación JWT** con contraseñas hasheadas con BCrypt y **autorización por políticas** para cuatro roles: `SuperAdmin`, `Owner`, `Staff` y `Client`.
- **Gestión de negocios, empleados y servicios** (CRUD) desde el panel de administración.
- **Motor de disponibilidad**: genera los huecos del día según el horario del negocio y la duración del servicio, marca como ocupados los que se solapan con reservas existentes del empleado y convierte entre UTC y la zona horaria del negocio (`Europe/Madrid`).
- **Validación de reservas** común a la reserva autenticada y a la pública: empleado del mismo negocio, dentro del horario, no en el pasado y sin solapamientos con otras reservas del empleado.
- **Página pública de reserva** (`/book/:slug`) en cuatro pasos: servicio y empleado → fecha y hora → datos personales → confirmación.
- **Calendario** de reservas con vistas de mes, semana y día (FullCalendar).
- **Dashboard y estadísticas**: KPIs, gráficas con Recharts, ranking de servicios y rendimiento por empleado, con filtros por negocio y periodo.
- **Exportación** de reservas a Excel (ClosedXML) y de estadísticas a PDF (QuestPDF).
- **Notificaciones en tiempo real** con SignalR al crear o cancelar reservas.
- **Job recurrente con Hangfire** (cada hora) que localiza las reservas confirmadas de las próximas 24 h para enviar recordatorios.

**Parciales / en desarrollo**

- **Emails**: `EmailService` registra el envío en el log; todavía no está conectado a un proveedor SMTP.
- **Pagos con Stripe**: el backend crea `PaymentIntent` y procesa el webhook firmado (`payment_intent.succeeded` marca la reserva como pagada y confirmada). La interfaz de pago en el frontend aún no está implementada.
- **Docker**: hay `Dockerfile` multi-stage para la API y `docker-compose.yml` con PostgreSQL. El frontend se ejecuta con Vite en local.

---

## Stack

| Capa | Tecnologías |
|------|-------------|
| Backend | ASP.NET Core 10 (Web API), C#, Entity Framework Core 10, Npgsql |
| Base de datos | PostgreSQL 16 (migraciones con EF Core) |
| Seguridad | JWT Bearer, BCrypt.Net, autorización por políticas |
| Tiempo real y jobs | SignalR, Hangfire (almacenamiento en PostgreSQL) |
| Integraciones | Stripe.net, ClosedXML, QuestPDF |
| Documentación API | OpenAPI + Scalar (entorno Development) |
| Frontend | React 19, TypeScript, Vite, React Router 7, TanStack Query, Axios |
| UI | Tailwind CSS 4, componentes shadcn/ui (Radix), Recharts, FullCalendar, Sonner |
| Tests y CI | xUnit, EF Core InMemory, GitHub Actions |

---

## Arquitectura

Solución organizada por capas, con dependencias hacia el dominio:

```
src/
├── BookingApp.Domain/          Entidades (Tenant, Business, Service, Staff, Booking, AppUser) y enums
├── BookingApp.Application/     Contratos de servicios (interfaces) y DTOs
├── BookingApp.Infrastructure/  EF Core (DbContext, configuraciones, migraciones), servicios, Hangfire
├── BookingApp.API/             Controllers, hub de SignalR, configuración (Program.cs)
└── Booking.Frontend/           SPA React + TypeScript + Vite
tests/
└── BookingApp.Tests/           Tests unitarios (xUnit)
```

- Las entidades encapsulan su estado (setters privados y métodos de fábrica como `Booking.Create`), y la lógica de solapamiento vive en el dominio (`Booking.OverlapsWith`).
- Las fechas se guardan en UTC y se convierten a la zona horaria del negocio al calcular y devolver los huecos.

---

## Puesta en marcha

### Requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (para PostgreSQL)

### 1. Clonar

```bash
git clone https://github.com/ANASSELMORABIT/BookingApp.git
cd BookingApp
```

### 2. Configurar variables

Copia `.env.example` a `.env` y rellena los valores. Para el backend en local, define los secretos con *user-secrets* en lugar de escribirlos en `appsettings.json`:

```bash
cd src/BookingApp.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=bookingapp;Username=<usuario>;Password=<contraseña>"
dotnet user-secrets set "Jwt:Key" "<clave-aleatoria-de-al-menos-32-caracteres>"
dotnet user-secrets set "Stripe:SecretKey" "<sk_test_...>"        # opcional
dotnet user-secrets set "Stripe:WebhookSecret" "<whsec_...>"      # opcional
cd ../..
```

### 3. Base de datos

```bash
docker compose up -d postgres
dotnet ef database update --project src/BookingApp.Infrastructure --startup-project src/BookingApp.API
```

### 4. Backend

```bash
dotnet run --project src/BookingApp.API
```

API en `http://localhost:5239` · Referencia interactiva (Scalar) en `http://localhost:5239/scalar/v1` · Panel de Hangfire en `http://localhost:5239/hangfire`.

### 5. Frontend

```bash
cd src/Booking.Frontend
npm install
npm run dev
```

Aplicación en `http://localhost:5173` (Vite redirige `/api` al backend).

### 6. Datos de prueba

La base de datos arranca vacía. Regístrate desde `/register` indicando un identificador de negocio (3–50 letras minúsculas, números o guiones): se crea el tenant y tu usuario como `Owner`. Después crea un negocio con servicios y empleados, y prueba la reserva pública en `http://localhost:5173/book/<identificador>`.

---

## Endpoints principales

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/api/Auth/register` | Público | Registro de un negocio nuevo (tenant + Owner) |
| POST | `/api/Auth/login` | Público | Login, devuelve JWT |
| GET / PUT | `/api/Profile` | JWT | Ver y editar perfil |
| GET / POST | `/api/Business` | JWT / Owner | Listar y crear negocios |
| GET / POST | `/api/Business/{id}/staff` | Owner, Staff | Empleados del negocio |
| GET / POST | `/api/Business/{id}/services` | JWT / Owner, Staff | Servicios del negocio |
| GET | `/api/Availability` | Público | Huecos disponibles |
| POST | `/api/Bookings` | JWT | Crear reserva |
| GET | `/api/Bookings/my` | JWT | Mis reservas |
| GET | `/api/Bookings/business/{id}?from=&to=` | Owner, Staff | Reservas del negocio en un rango |
| DELETE | `/api/Bookings/{id}` | JWT | Cancelar reserva |
| GET | `/api/Admin/dashboard` | Owner, Staff | Estadísticas |
| GET | `/api/Export/excel` · `/api/Export/pdf` | Owner | Exportaciones |
| GET | `/api/public/business/{slug}` | Público | Datos públicos del negocio |
| POST | `/api/public/book` | Público | Reserva sin cuenta |
| POST | `/api/Payments/create-intent` · `/api/Payments/webhook` | JWT · Stripe | Pagos |
| WS | `/hubs/notifications` | JWT | Notificaciones SignalR |

---

## Tests

```bash
dotnet test
```

27 tests (xUnit) que se ejecutan también en GitHub Actions en cada push:

- **Dominio**: solapamiento entre reservas y cambio de estado.
- **Reservas** (EF Core InMemory): conversión hora local ↔ UTC, solapamientos, reservas consecutivas, horario del negocio, fechas pasadas, reserva pública y aislamiento entre tenants.
- **Disponibilidad**: huecos de toda la jornada (incluido el último), huecos ocupados y empleados de otro negocio.
- **Registro y login**: slugs reservados o inválidos, imposibilidad de unirse a un tenant existente y mensajes de error que no revelan qué datos existen.

El workflow de CI compila y prueba el backend y ejecuta lint y build del frontend.

---

## Seguridad

- Los secretos (cadena de conexión, clave JWT, claves de Stripe) no se guardan en el repositorio: se leen de *user-secrets* en desarrollo o de variables de entorno en Docker. La API no arranca si falta la clave JWT o la cadena de conexión.
- El registro siempre crea un tenant nuevo con rol `Owner`; los identificadores reservados (`superadmin`, `admin`…) no se pueden registrar.

## Próximos pasos

- Proveedor de email real para confirmaciones y recordatorios.
- Flujo de pago en el frontend con Stripe Elements.
- Restricción de exclusión en PostgreSQL para impedir reservas solapadas en peticiones concurrentes.
- Filtros globales de EF Core por tenant.

---

## Autor

**Anass El Morabit** · [github.com/ANASSELMORABIT](https://github.com/ANASSELMORABIT)

Proyecto de uso educativo y de portfolio.
