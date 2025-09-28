# CRM CNPJ - Lead Generation System

## Overview

CRM CNPJ is a comprehensive B2B lead generation and sales management platform that automates prospecting based on Brazilian company data (CNPJ). The system combines lead generation, sales pipeline management, and gamification features to help sales teams efficiently manage their B2B prospects and close deals.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit-based OIDC authentication with session management
- **API**: RESTful API with structured routing
- **File Structure**: Monorepo with shared schema between client and server

### UI Design System
- **Component Library**: shadcn/ui (New York style)
- **Theme**: Custom CSS variables with dark/light mode support
- **Icons**: Lucide React icons
- **Responsive**: Mobile-first design with Tailwind breakpoints

## Key Components

### Authentication System
- **Provider**: Replit OIDC integration
- **Session Storage**: PostgreSQL-based sessions with connect-pg-simple
- **Role-based Access**: User roles (VENDEDOR, GESTOR, ADMIN, SUPER_ADMIN)
- **Security**: HTTP-only cookies with secure session management

### Lead Generation Module
- **CNPJ Search**: Advanced filtering by sector, company size, location, revenue
- **Company Database**: Structured company data with enrichment capabilities
- **Lead Conversion**: Convert company prospects to leads with estimated values
- **Bulk Operations**: Multi-select capabilities for batch lead creation

### Sales Pipeline Management
- **Kanban Board**: Visual drag-and-drop pipeline with 7 status columns
- **Lead Tracking**: Full lead lifecycle from "NOVO" to "FECHADO_GANHO/PERDIDO"
- **Status Management**: Automated status transitions with audit trail
- **Lead Enrichment**: Company data integration with lead records

### Sales Registration System
- **Sale Recording**: Structured sale entry with validation
- **Approval Workflow**: Manager approval process for sales verification
- **Document Management**: File upload support for sale proofs
- **Point System**: Gamification points calculation based on sale values

### Business Onboarding System
- **Multi-step Form**: 4-step onboarding process for new managers
- **Company Registration**: Complete company data collection with CNPJ validation
- **Manager Setup**: Responsible person data with CPF and contact information
- **Address Collection**: Complete Brazilian address with state selection
- **Initial Configuration**: Sales goals and team size setup
- **Document Formatting**: Automatic formatting for CNPJ, CPF, and CEP

### Gamification Engine
- **Ranking System**: User leaderboards with point calculations
- **Achievement System**: Badge and milestone tracking
- **Team Competition**: Team-based metrics and comparisons
- **Goal Tracking**: Monthly targets and progress monitoring

### Mass Messaging Module (Módulo de Disparo em Massa)
- **Multi-channel Support**: WhatsApp Business and Email SMTP campaigns
- **Contact Management**: Bulk upload system with CSV/XLSX/TXT support
- **Integrations Hub**: Unified navigation for WhatsApp and Email connections
- **WhatsApp Integration**: QR code authentication with real-time WebSocket status
- **Email Configuration**: SMTP setup interface with provider templates (Gmail, Outlook, SendGrid)
- **Campaign Management**: Visual dashboard with metrics, monitoring, and execution tracking

## Data Flow

### Lead Generation Flow
1. User applies filters in search interface
2. System queries company database with filters
3. Results displayed in paginated company cards
4. User selects companies and converts to leads
5. Leads created with initial status and assigned to user

### Sales Pipeline Flow
1. Leads displayed in Kanban columns by status
2. Users drag/drop leads between status columns
3. Status updates trigger API calls to backend
4. Database updated with new status and timestamp
5. Real-time updates refresh UI state

### Sales Registration Flow
1. User selects lead from dropdown in sales form
2. Sale details entered with validation
3. Sale submitted with "PENDENTE_APROVACAO" status
4. Manager reviews in approvals interface
5. Approval/rejection updates sale status and awards points

### Gamification Flow
1. Approved sales trigger point calculations
2. User rankings updated based on total points
3. Achievement progress checked and badges awarded
4. Team statistics calculated and displayed
5. Dashboard metrics updated in real-time

## External Dependencies

### Database
- **Provider**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle with TypeScript schema
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Connection pooling with @neondatabase/serverless

### Authentication
- **Provider**: Replit OIDC service
- **Session Store**: PostgreSQL sessions table
- **Passport Integration**: openid-client strategy
- **Session Management**: Express-session middleware

### UI Components
- **Component Library**: Radix UI primitives
- **Styling**: Tailwind CSS with custom configuration
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for localization (Portuguese)

### Development Tools
- **Build System**: Vite with React plugin
- **TypeScript**: Strict configuration with path mapping
- **Code Quality**: ESLint and TypeScript checking
- **Development**: Hot module replacement and error overlay

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `/dist/public`
2. **Backend Build**: esbuild bundles server to `/dist/index.js`
3. **Database**: Drizzle migrations applied to production database
4. **Assets**: Static assets served from build directory

### Environment Configuration
- **Database**: PostgreSQL connection via DATABASE_URL
- **Authentication**: Replit OIDC configuration
- **Sessions**: Secure session secret for production
- **Build Optimization**: Production-specific optimizations

### Production Considerations
- **Security**: HTTPS-only cookies and secure headers
- **Performance**: Static asset caching and compression
- **Monitoring**: Error tracking and performance monitoring
- **Scaling**: Database connection pooling for concurrent users

## Changelog

```
Changelog:
- September 28, 2025. Consolidated WhatsApp and Email menus into unified "Integrações" hub with SMTP configuration interface
- July 16, 2025. Added business onboarding form for managers with multi-step interface
- July 04, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```