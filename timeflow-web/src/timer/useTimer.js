import { useContext } from "react";
import { TimerContext } from "./TimerContext";

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer는 TimerProvider 안에서만 사용해야 합니다.");
  }
  return ctx;
}
