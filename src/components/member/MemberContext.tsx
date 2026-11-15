"use client";

import { createContext, useContext } from "react";
import type { MemberData } from "@/lib/member";

/**
 * Session de l'espace membre, fournie par MemberShell à toutes les pages de /espace-membre :
 * fiche du membre et réglages (data), mise à jour après une action (setData), relecture depuis
 * le serveur (reload) et déconnexion. Dans une page : const { data } = useMember().
 * Les pages autres que l'accueil ne s'affichent qu'à un membre validé (actif ou suspendu).
 */
export interface MemberSession {
  data: MemberData;
  setData: (d: MemberData) => void;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
}

export const MemberContext = createContext<MemberSession | null>(null);

export function useMember(): MemberSession {
  const s = useContext(MemberContext);
  if (!s) throw new Error("useMember() en dehors de l'espace membre");
  return s;
}
