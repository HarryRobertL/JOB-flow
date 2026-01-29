/**
 * UI Components Index
 * 
 * Central export point for all shadcn UI compatible components.
 * This allows for clean imports like: import { Button, Card } from "@/components/ui"
 */

export { Button, type ButtonProps } from "./button"
export { Input, type InputProps } from "./input"
export { Label, type LabelProps } from "./label"
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card"
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  type DialogProps,
  type DialogContentProps,
} from "./dialog"
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
} from "./tabs"
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table"
export {
  Sidebar,
  SidebarProvider,
  SidebarBody,
  DesktopSidebar,
  MobileSidebar,
  SidebarLink,
  useSidebar,
} from "./sidebar"
export { SidebarDemo, Logo, LogoIcon } from "./sidebar-demo"
export { Badge, type BadgeProps } from "./badge"
export { Progress, type ProgressProps } from "./progress"
export { Select, type SelectProps } from "./select"
export { Textarea, type TextareaProps } from "./textarea"

