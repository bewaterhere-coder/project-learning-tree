import { createContext, useContext, type ReactNode } from "react";
import type { WorkspaceLocale } from "../../workspace/index.js";

const LocaleContext = createContext<WorkspaceLocale>("en-US");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: WorkspaceLocale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): WorkspaceLocale {
  return useContext(LocaleContext);
}
