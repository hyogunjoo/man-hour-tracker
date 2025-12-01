// src/settings/SettingsContext.js
import { createContext, useContext } from "react";

export const SettingsContext = createContext(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error(
      "useSettings는 SettingsProvider 안에서만 사용해야 합니다."
    );
  }
  return ctx;
}
