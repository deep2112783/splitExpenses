
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { PanelLeft } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";

function CollapsedHeader() {
  const { state, isMobile, toggleSidebar } = useSidebar();

  if (!isMobile && state !== "collapsed") return null;

  return (
    <header className="sticky top-0 z-50 glass flex items-center h-14 px-4 border-b border-border">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Open sidebar"
      >
        <PanelLeft className="w-5 h-5" />
      </button>
    </header>
  );
}

const AppLayout = ({ children }) => <ProtectedLayout>{children}</ProtectedLayout>;

function ProtectedLayout({ children }) {
  const { isCheckingAuth } = useRequireAuth();

  if (isCheckingAuth) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <CollapsedHeader />
          <main className="container px-4 sm:px-6 py-4 sm:py-6 flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default AppLayout;