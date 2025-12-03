// src/timer/TimerProvider.jsx
import { useState, useEffect } from "react";
import { TimerContext } from "./TimerContext";

// 세션은 이 키만 사용 (고정)
const SESSIONS_KEY = "timeflow_sessions_v1";

// 런타임 키
const RUNTIME_KEY = "timeflow_runtime_v1";

// 세션 로드
function loadSessionsFromStorage() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("세션 로드 중 오류:", e);
    return [];
  }
}

// 런타임 로드
function loadRuntimeFromStorage() {
  try {
    const raw = localStorage.getItem(RUNTIME_KEY);
    if (!raw) {
      return {
        isRunning: false,
        currentTagId: null,
        sessionStartAt: null,
        resumeAt: null,
        accumulatedSeconds: 0,
        elapsedSeconds: 0,
      };
    }

    const parsed = JSON.parse(raw) || {};
    const isRunning = Boolean(parsed.isRunning);
    const currentTagId =
      parsed.currentTagId === undefined ? null : parsed.currentTagId;
    const sessionStartAt = parsed.sessionStartAt || null;
    const resumeAtMs = parsed.resumeAt || null;
    const accumulated = Number(parsed.accumulatedSeconds) || 0;

    let elapsed = accumulated;
    if (isRunning && resumeAtMs) {
      const now = new Date().getTime();
      const delta = Math.floor((now - resumeAtMs) / 1000);
      if (delta > 0) {
        elapsed = accumulated + delta;
      }
    }

    return {
      isRunning,
      currentTagId,
      sessionStartAt,
      resumeAt: resumeAtMs,
      accumulatedSeconds: accumulated,
      elapsedSeconds: elapsed,
    };
  } catch (e) {
    console.error("런타임 로드 중 오류:", e);
    return {
      isRunning: false,
      currentTagId: null,
      sessionStartAt: null,
      resumeAt: null,
      accumulatedSeconds: 0,
      elapsedSeconds: 0,
    };
  }
}

// 런타임 저장
function saveRuntimeToStorage(state) {
  try {
    const payload = {
      isRunning: state.isRunning,
      currentTagId: state.currentTagId,
      sessionStartAt: state.sessionStartAt,
      resumeAt: state.resumeAt,
      accumulatedSeconds: state.accumulatedSeconds,
    };
    localStorage.setItem(RUNTIME_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("런타임 저장 중 오류:", e);
  }
}

// 세션 저장: v1에만 저장 (앞으로 구조/키 변경 금지)
function saveSessionsToStorage(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("세션 저장 중 오류:", e);
  }
}

export function TimerProvider({ children }) {
  // 세션: 항상 배열
  const [sessions, setSessions] = useState(() => loadSessionsFromStorage());

  // 런타임: lazy init
  const initialRuntime = loadRuntimeFromStorage();
  const [isRunning, setIsRunning] = useState(initialRuntime.isRunning);
  const [currentTagId, setCurrentTagId] = useState(
    initialRuntime.currentTagId
  );
  const [sessionStartAt, setSessionStartAt] = useState(
    initialRuntime.sessionStartAt
  );
  const [resumeAt, setResumeAt] = useState(initialRuntime.resumeAt);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(
    initialRuntime.accumulatedSeconds
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(
    initialRuntime.elapsedSeconds
  );

  // 세션 변경 시 저장
  useEffect(() => {
    saveSessionsToStorage(sessions);
  }, [sessions]);

  // 런타임 변경 시 저장
  useEffect(() => {
    saveRuntimeToStorage({
      isRunning,
      currentTagId,
      sessionStartAt,
      resumeAt,
      accumulatedSeconds,
    });
  }, [isRunning, currentTagId, sessionStartAt, resumeAt, accumulatedSeconds]);

  // 타이머 틱: 절전/새로고침 포함 시간 반영
  useEffect(() => {
    if (!isRunning || !resumeAt) return;

    const timerId = setInterval(() => {
      const now = new Date().getTime();
      const delta = Math.floor((now - resumeAt) / 1000);
      const next = accumulatedSeconds + Math.max(0, delta);
      setElapsedSeconds(next);
    }, 500);

    return () => clearInterval(timerId);
  }, [isRunning, resumeAt, accumulatedSeconds]);

  // Start
  const start = () => {
    if (!currentTagId) {
      window.alert("타이머를 시작하기 전에 태그를 선택해 주세요.");
      return;
    }
    if (isRunning) return;

    const now = new Date().getTime();

    // 새로운 세션 시작
    if (!sessionStartAt) {
      setSessionStartAt(new Date(now).toISOString());
      setAccumulatedSeconds(0);
      setElapsedSeconds(0);
    }

    setResumeAt(now);
    setIsRunning(true);
  };

  // Pause
  const pause = () => {
    if (!isRunning || !resumeAt) return;

    const now = new Date().getTime();
    const delta = Math.floor((now - resumeAt) / 1000);
    const nextAccum = accumulatedSeconds + Math.max(0, delta);

    setAccumulatedSeconds(nextAccum);
    setElapsedSeconds(nextAccum);
    setIsRunning(false);
    setResumeAt(null);
  };

  // Stop & Save
  const stopAndSave = () => {
    if (!currentTagId) {
      resetRuntime();
      return;
    }

    const now = new Date().getTime();
    let totalSeconds = accumulatedSeconds;

    if (isRunning && resumeAt) {
      const delta = Math.floor((now - resumeAt) / 1000);
      totalSeconds += Math.max(0, delta);
    }

    if (!sessionStartAt || totalSeconds <= 0) {
      resetRuntime();
      return;
    }

    const newSession = {
      id: `${now}`,
      tag: currentTagId,
      startedAt: sessionStartAt,
      endedAt: new Date(now).toISOString(),
      durationSeconds: totalSeconds,
    };

    setSessions((prev) => [...prev, newSession]);

    setIsRunning(false);
    setResumeAt(null);
    setSessionStartAt(null);
    setAccumulatedSeconds(0);
    setElapsedSeconds(0);
  };

  const resetRuntime = () => {
    setIsRunning(false);
    setResumeAt(null);
    setSessionStartAt(null);
    setAccumulatedSeconds(0);
    setElapsedSeconds(0);
    // currentTagId는 유지 (사용자 편의)
  };

  const value = {
    sessions,
    setSessions,
    isRunning,
    elapsedSeconds,
    currentTagId,
    setCurrentTagId,
    start,
    pause,
    stopAndSave,
  };

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export default TimerProvider;
