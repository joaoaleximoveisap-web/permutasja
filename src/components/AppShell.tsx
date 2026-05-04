import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    {/* Hierarquia: shell flex horizontal, main fluido com clamp() para padding entre 1rem (mobile) e 2.5rem (desktop). overflow-x-hidden trava qualquer vazamento horizontal. */}
    <div className="min-h-screen flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main
          className="flex-1 animate-fade-in min-w-0"
          style={{
            padding: "clamp(1rem, 3vw, 2.5rem)",
            paddingBottom: "clamp(6rem, 12vw, 2.5rem)",
          }}
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
