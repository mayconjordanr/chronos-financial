# Chronos Financial Frontend

A modern, responsive Next.js 14 application for the CHRONOS multi-tenant financial SaaS platform.

## Features

- ✅ **Next.js 14** with App Router architecture
- ✅ **TypeScript** for type safety
- ✅ **TailwindCSS + shadcn/ui** for modern, accessible UI components
- ✅ **Mobile-first responsive design**
- ✅ **Multi-tenant authentication** with magic link flow
- ✅ **Dark/light theme system** with system preference detection
- ✅ **Real-time subscriptions** for live data updates
- ✅ **Comprehensive loading states** and error boundaries
- ✅ **Modern state management** with Zustand
- ✅ **API integration** with React Query
- ✅ **Form validation** with React Hook Form + Zod

## Tech Stack

### Core
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **React 18** - UI library with latest features

### Styling & UI
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible component library
- **Lucide React** - Beautiful, customizable icons
- **next-themes** - Theme management

### State Management & Data
- **Zustand** - Lightweight state management
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client

### Forms & Validation
- **React Hook Form** - Performant form library
- **Zod** - TypeScript-first schema validation

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm
- Backend API running (see backend README)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Application Configuration
NEXT_PUBLIC_APP_NAME=Chronos Financial
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Key Features

### Authentication Flow
- **Magic Link Authentication**: Secure, passwordless login
- **Multi-tenant Support**: Organization-based user isolation
- **JWT Token Management**: Automatic token refresh and storage
- **Protected Routes**: Auth guards for secure pages

### Dashboard
- **Financial Overview**: Account balances, income/expense summaries
- **Recent Transactions**: Latest financial activity
- **Interactive Charts**: Visual data representation
- **Real-time Updates**: Live data synchronization

### Responsive Design
- **Mobile-first approach**: Optimized for mobile devices
- **Adaptive layouts**: Seamless experience across screen sizes
- **Touch-friendly interactions**: Mobile-optimized UI components
- **Progressive enhancement**: Works on all device types

### Theme System
- **Dark/Light modes**: User preference-based theming
- **System detection**: Automatic theme based on OS preference
- **CSS variables**: Consistent color system
- **Smooth transitions**: Elegant theme switching

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   └── globals.css        # Global styles and CSS variables
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   └── common/            # Reusable components
├── lib/
│   ├── api-client.ts      # API client configuration
│   ├── validations.ts     # Zod schema validations
│   └── hooks/             # Custom React hooks
├── store/                 # Zustand state management
└── types/                 # TypeScript type definitions
```

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding Components

```bash
# Add shadcn/ui components
npx shadcn@latest add [component-name]
```

## Integration with Backend

This frontend is designed to work seamlessly with the CHRONOS backend API. Ensure the backend is running and accessible at the configured API URL for full functionality.

For backend setup instructions, see the main project README and backend documentation.
