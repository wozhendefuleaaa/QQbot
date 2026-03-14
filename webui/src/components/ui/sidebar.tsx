import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sidebarVariants = cva(
  "flex flex-col border-r bg-background",
  {
    variants: {
      size: {
        default: "w-56",
        sm: "w-48",
        lg: "w-64",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface SidebarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sidebarVariants> {}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, size, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(sidebarVariants({ size }), className)}
      {...props}
    />
  )
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 p-4 border-b", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-auto p-2", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarNav = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex flex-col gap-1", className)}
    {...props}
  />
))
SidebarNav.displayName = "SidebarNav"

const sidebarNavItemVariants = cva(
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active: "bg-primary/10 text-primary font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SidebarNavItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarNavItemVariants> {
  active?: boolean
  icon?: React.ReactNode
}

const SidebarNavItem = React.forwardRef<HTMLDivElement, SidebarNavItemProps>(
  ({ className, variant, active, icon, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        sidebarNavItemVariants({ variant: active ? "active" : "default" }),
        className
      )}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{children}</span>
    </div>
  )
)
SidebarNavItem.displayName = "SidebarNavItem"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  SidebarNavItem,
  sidebarVariants,
}
