# Sidebar Component Integration Guide

## Overview

The Sidebar component has been successfully integrated into the AutoApplyer codebase. It's a fully animated, responsive sidebar component compatible with shadcn UI patterns.

## What Was Done

### 1. Dependencies Installed
- ✅ `framer-motion` - For smooth animations
- ✅ `lucide-react` - For icons (Menu, X, LayoutDashboard, etc.)

### 2. Component Structure
- ✅ Created `src/components/ui/sidebar.tsx` - Main sidebar component
- ✅ Created `src/components/ui/sidebar-demo.tsx` - Demo implementation with AutoApplyer branding
- ✅ Updated `src/components/ui/index.ts` - Added sidebar exports

### 3. Adaptations Made
- **Removed Next.js dependencies**: Replaced `next/link` with regular `<a>` tags
- **Removed Next.js Image**: Replaced with standard `<img>` tag
- **Removed "use client" directive**: Not needed in Vite/React
- **Updated branding**: Changed from "Acet Labs" to "AutoApplyer"
- **Updated links**: Changed to AutoApplyer routes (/status, /setup, etc.)
- **Updated icons**: Using AutoApplyer-relevant icons (FileText, BarChart3, etc.)

## Component API

### Sidebar Components

```tsx
import {
  Sidebar,
  SidebarProvider,
  SidebarBody,
  DesktopSidebar,
  MobileSidebar,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar"
```

### Basic Usage

```tsx
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { LayoutDashboard, Settings } from "lucide-react"

function MyPage() {
  const [open, setOpen] = useState(false)
  
  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "Settings",
      href: "/setup",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody>
        <div className="flex flex-col gap-2">
          {links.map((link, idx) => (
            <SidebarLink key={idx} link={link} />
          ))}
        </div>
      </SidebarBody>
    </Sidebar>
  )
}
```

### Using the Demo Component

The easiest way to get started is to use the pre-configured demo:

```tsx
import { SidebarDemo } from "@/components/ui/sidebar-demo"

function App() {
  return <SidebarDemo />
}
```

## Features

### Desktop Behavior
- **Hover to expand**: Sidebar expands from 60px to 300px on hover
- **Smooth animations**: Framer Motion handles all transitions
- **Auto-collapse**: Returns to 60px when mouse leaves

### Mobile Behavior
- **Hamburger menu**: Click menu icon to open
- **Slide-in animation**: Sidebar slides in from the left
- **Full-screen overlay**: Covers entire screen on mobile
- **Close button**: X icon in top-right to close

### Context API
- Uses React Context for state management
- `useSidebar()` hook provides access to sidebar state
- Supports controlled and uncontrolled modes

## Customization

### Changing Colors
The sidebar uses Tailwind classes that align with the design system:
- `bg-neutral-100` - Light background
- `dark:bg-neutral-800` - Dark mode background
- `text-neutral-700` - Text color

### Changing Width
Edit the width values in `DesktopSidebar`:
```tsx
animate={{
  width: animate ? (open ? "300px" : "60px") : "300px",
}}
```

### Adding Custom Links
Update the `links` array in your component:
```tsx
const links = [
  {
    label: "Your Label",
    href: "/your-route",
    icon: <YourIcon className="h-5 w-5" />,
  },
]
```

## Integration with Existing AppShell

The sidebar can be used alongside or instead of the existing `AppShell` component. Consider:

1. **Replace AppShell sidebar**: Use the new animated sidebar
2. **Use both**: Keep AppShell for top bar, use Sidebar for navigation
3. **Hybrid approach**: Integrate Sidebar into AppShell

## Example: Full Page with Sidebar

```tsx
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { LayoutDashboard, FileText } from "lucide-react"

export function MyPage() {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="flex h-screen">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody>
          <div className="flex flex-col gap-2">
            <SidebarLink
              link={{
                label: "Dashboard",
                href: "/",
                icon: <LayoutDashboard className="h-5 w-5" />,
              }}
            />
            <SidebarLink
              link={{
                label: "Applications",
                href: "/status",
                icon: <FileText className="h-5 w-5" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      <main className="flex-1 p-6">
        {/* Your page content */}
      </main>
    </div>
  )
}
```

## Assets

The demo uses an Unsplash image for the avatar:
- URL: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop`
- This is a stock photo that exists and loads reliably

## Next Steps

1. **Test the component**: View `SidebarExample` page to see it in action
2. **Customize links**: Update the links array with your actual routes
3. **Add routing**: If using React Router, replace `<a>` tags with `<Link>` components
4. **Integrate with backend**: Connect sidebar links to your FastAPI routes
5. **Add user data**: Replace placeholder user info with real data from your backend

## Notes

- The component is fully TypeScript typed
- All animations are accessible and respect `prefers-reduced-motion`
- The component follows shadcn UI patterns for consistency
- Dark mode is supported via Tailwind's `dark:` classes

