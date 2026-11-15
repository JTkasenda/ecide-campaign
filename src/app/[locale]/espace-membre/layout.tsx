import type { ReactNode } from "react";
import MemberShell from "@/components/member/MemberShell";

/**
 * Toutes les pages de l'espace membre partagent la session (connexion par code), la navigation
 * du membre, la cloche des notifications et le thème sombre (MemberShell).
 */
export default function EspaceMembreLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex-grow member-space">
      <MemberShell>{children}</MemberShell>
    </main>
  );
}
