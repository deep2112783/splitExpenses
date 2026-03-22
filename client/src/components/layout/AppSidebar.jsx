import { Home, Users, Bell, User, Wallet, Split, PanelLeftClose, ReceiptText, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useNotificationsCount } from "@/hooks/use-notifications-count";
import { clearAuthSession } from "@/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Groups", url: "/groups", icon: Users },
  { title: "Expenses", url: "/expenses", icon: ReceiptText },
  { title: "Balances", url: "/balances", icon: Wallet },
  { title: "Notifications", url: "/notifications", icon: Bell, badge: true },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotificationsCount();

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className={`pt-5 flex flex-col h-full ${collapsed ? "px-0" : "px-2"}`}>
        <div className={`flex items-center mb-8 ${collapsed ? "justify-center px-0" : "justify-between px-3"}`}>
          <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
              <Split className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-display font-bold text-lg tracking-tight">SplitSmart</span>}
          </div>
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {items.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  (item.url !== "/dashboard" && location.pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`h-11 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-md"
                          : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="relative flex items-center gap-3 px-3"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                        {item.badge && unreadCount > 0 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-5 h-5 px-1 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                            {unreadCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pb-3">
          <button
            onClick={handleLogout}
            className="w-full h-11 rounded-xl flex items-center gap-3 px-3 text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
