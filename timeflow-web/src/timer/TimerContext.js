// src/timer/TimerContext.js
import { createContext, useContext } from "react";

export const TimerContext = createContext(null);

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer는 TimerProvider 안에서만 사용해야 합니다.");
  }
  return ctx;
}
