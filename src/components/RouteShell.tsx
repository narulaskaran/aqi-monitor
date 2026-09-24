import { ReactNode } from "react";
import { AQIHeader } from "./AQIHeader";
import { KofiButton } from "./KofiButton";
import { ThemeToggle } from "./ThemeToggle";

interface RouteShellProps {
  children: ReactNode;
}

export function RouteShell({ children }: RouteShellProps) {
  return (
    <div className="app route-page">
      <header className="app-header">
        <AQIHeader />
        <div className="app-header-actions">
          <ThemeToggle className="app-theme-toggle" />
        </div>
      </header>

      <main className="route-main">{children}</main>

      <footer className="app-footer">
        <span>Data from the Google Air Quality API.</span>
        <KofiButton />
      </footer>
    </div>
  );
}
