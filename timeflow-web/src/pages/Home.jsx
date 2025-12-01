// src/pages/Home.jsx
import { useMemo } from "react";
import { useTimer } from "../timer/useTimer";
import { useSettings } from "../settings/SettingsContext";

// ISO 문자열이 "오늘"인지 판별
function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ISO가 최근 N일 안(포함)인지
function isWithinLastDays(isoString, days) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < days;
}

// 태그 색상 클래스 매핑 (Tags 페이지와 동일 팔레트)
const COLOR_CLASS_MAP = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
  rose: "bg-rose-500",
};

export default function Home() {
  const {
    sessions,
    isRunning,
    elapsedSeconds,
    selectedTag,
    formatTime,
  } = useTimer();

  const {
    dailyGoalHours,
    tags,
    masterGoalName,
    masterGoalHours,
    masterGoalTagIds,
  } = useSettings();

  // 태그 맵
  const tagMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(tags)) {
      for (const t of tags) {
        map.set(t.id, t);
      }
    }
    return map;
  }, [tags]);

  function getTagLabel(id) {
    if (!id) return "태그 없음";
    const t = tagMap.get(id);
    return t?.label ?? id;
  }

  function getTagColorClass(id) {
    const t = tagMap.get(id);
    if (!t || !t.color) return "bg-slate-500";
    return COLOR_CLASS_MAP[t.color] ?? "bg-slate-500";
  }

  // "목표 태그" 결정 (Settings 기준, Home/Report 공통 로직)
  const goalTagIds = useMemo(() => {
    if (!Array.isArray(tags) || tags.length === 0) return [];

    const activeIds = tags
      .filter((t) => t.isActive !== false)
      .map((t) => t.id);

    const userSelected =
      Array.isArray(masterGoalTagIds) && masterGoalTagIds.length > 0
        ? masterGoalTagIds
        : null;

    if (!userSelected) {
      // 사용자가 아무것도 선택 안 했으면 → 활성 태그 전체 사용
      return activeIds;
    }

    const selectedSet = new Set(userSelected);
    const filtered = activeIds.filter((id) => selectedSet.has(id));

    // 혹시 겹치는 게 없으면 안전하게 활성 태그 전체 사용
    return filtered.length > 0 ? filtered : activeIds;
  }, [tags, masterGoalTagIds]);

  const goalTagSet = useMemo(
    () => new Set(goalTagIds),
    [goalTagIds]
  );

  // 목표 태그 세션만 따로 뽑기
  const goalSessions = useMemo(() => {
    if (!Array.isArray(sessions) || goalTagIds.length === 0) return [];
    const set = new Set(goalTagIds);
    return sessions.filter((s) => s.tag && set.has(s.tag));
  }, [sessions, goalTagIds]);

  // 전체 누적 목표 시간(초) = 저장된 목표 세션 + (진행 중 세션이 목표 태그면 elapsedSeconds 포함)
  const goalTotalSeconds = useMemo(() => {
    const base = goalSessions.reduce(
      (sum, s) => sum + (s.durationSeconds ?? 0),
      0
    );
    const running =
      isRunning && selectedTag && goalTagSet.has(selectedTag)
        ? elapsedSeconds
        : 0;
    return base + running;
  }, [goalSessions, isRunning, elapsedSeconds, selectedTag, goalTagSet]);

  const goalTotalHours = goalTotalSeconds / 3600;
  const goalTargetHours = masterGoalHours > 0 ? masterGoalHours : 10000;
  const goalPercentRaw =
    goalTargetHours > 0 ? goalTotalHours / goalTargetHours : 0;
  const goalPercent = Math.min(100, Math.round(goalPercentRaw * 100));

  // 마일스톤 (단순 안내)
  const milestones = [100, 500, 1000, 3000, 5000, 10000];
  const nextMilestone = milestones.find((m) => goalTotalHours < m) ?? null;
  const toNextMilestone =
    nextMilestone != null
      ? Math.max(0, nextMilestone - goalTotalHours)
      : 0;

  // 오늘 목표 태그 시간
  const todayGoalSessions = useMemo(
    () => goalSessions.filter((s) => isToday(s.startedAt)),
    [goalSessions]
  );

  const todayGoalBaseSec = useMemo(
    () =>
      todayGoalSessions.reduce(
        (sum, s) => sum + (s.durationSeconds ?? 0),
        0
      ),
    [todayGoalSessions]
  );

  const todayGoalRunningSec =
    isRunning && selectedTag && goalTagSet.has(selectedTag)
      ? elapsedSeconds
      : 0;

  const todayGoalSeconds = todayGoalBaseSec + todayGoalRunningSec;

  // 오늘 태그별 합계 (목표 태그 중)
  const todayTagTotals = useMemo(() => {
    const map = {};
    for (const s of todayGoalSessions) {
      const key = s.tag ?? "unknown";
      map[key] = (map[key] ?? 0) + (s.durationSeconds ?? 0);
    }
    if (
      isRunning &&
      selectedTag &&
      goalTagSet.has(selectedTag) &&
      elapsedSeconds > 0
    ) {
      const key = selectedTag;
      map[key] = (map[key] ?? 0) + elapsedSeconds;
    }
    return map;
  }, [todayGoalSessions, isRunning, selectedTag, elapsedSeconds, goalTagSet]);

  const topTodayTagEntry = useMemo(() => {
    const entries = Object.entries(todayTagTotals);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0];
  }, [todayTagTotals]);

  // 오늘 목표 대비 퍼센트
  const goalDailySeconds = Math.max(
    0,
    Math.round((dailyGoalHours ?? 0) * 3600)
  );
  const dailyPercent =
    goalDailySeconds > 0
      ? Math.min(100, Math.round((todayGoalSeconds / goalDailySeconds) * 100))
      : 0;

  // 최근 7일 트렌드 (목표 태그 기준)
  const last7DaysData = useMemo(() => {
    if (!Array.isArray(goalSessions) || goalSessions.length === 0) return [];

    // 날짜별 합계(sec)
    const map = new Map();
    for (const s of goalSessions) {
      if (!isWithinLastDays(s.startedAt, 7)) continue;
      const d = new Date(s.startedAt);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const prev = map.get(key) ?? 0;
      map.set(key, prev + (s.durationSeconds ?? 0));
    }

    // 오늘 기준으로 과거 6일 + 오늘 = 7개
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - i
      );
      const key = d.toISOString().slice(0, 10);
      const sec = map.get(key) ?? 0;
      const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][
        d.getDay()
      ];
      result.push({
        dateKey: key,
        label: dayLabel,
        seconds: sec,
      });
    }

    return result;
  }, [goalSessions]);

  const maxTrendSec = useMemo(() => {
    return last7DaysData.reduce(
      (max, d) => Math.max(max, d.seconds),
      0
    );
  }, [last7DaysData]);

  const hasAnyGoalTime = goalTotalSeconds > 0;
  const hasAnyToday = todayGoalSeconds > 0;
  const hasAnyTrend = maxTrendSec > 0;

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Mastery Goal</h1>
        <p className="text-sm text-slate-300">
          하나의 큰 목표를 정해두고, 그 목표를 향해 얼마나 시간을 쌓아 왔는지 확인합니다.
        </p>
      </div>

      {/* 1. 일만시간(또는 설정한 목표시간) 진행도 카드 */}
      <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Mastery Goal
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {masterGoalName || "나의 10,000시간 목표"}
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>목표 시간</div>
            <div className="font-mono text-sm text-slate-100">
              {goalTargetHours.toLocaleString("ko-KR")}시간
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <span>
              지금까지{" "}
              <span className="font-mono font-semibold">
                {goalTotalHours.toFixed(1)}
              </span>{" "}
              시간 쌓음
            </span>
            <span>{goalPercent}% 달성</span>
          </div>
        </div>

        {hasAnyGoalTime ? (
          <p className="mt-1 text-xs text-slate-400">
            목표에 포함된 태그의 세션만 집계합니다.{" "}
            {nextMilestone != null && (
              <>
                다음 마일스톤{" "}
                <span className="font-mono font-semibold">
                  {nextMilestone}
                </span>
                시간까지{" "}
                <span className="font-mono font-semibold">
                  {toNextMilestone.toFixed(1)}
                </span>
                시간 남았습니다.
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            아직 목표에 포함된 태그로 기록된 시간이 없습니다. Timer에서 태그를 선택하고 첫 세션을 시작해 보세요.
          </p>
        )}
      </div>

      {/* 2. 오늘 요약 카드 (목표 기준) */}
      <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 오늘 총 목표 시간 */}
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            오늘 목표 시간
          </div>
          <div className="text-sm text-slate-200 mb-1">
            목표 {dailyGoalHours ?? 0}시간 대비
          </div>
          <div className="text-2xl font-mono font-semibold">
            {formatTime(todayGoalSeconds)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            오늘 기록된 목표 태그 시간 기준
          </div>
        </div>

        {/* 오늘 목표 달성도 */}
        <div className="border-t border-slate-700 pt-3 md:border-t-0 md:border-l md:pl-4 md:ml-4">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            오늘 목표 달성도
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden mb-1">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
          <div className="text-xs text-slate-300 flex items-center justify-between">
            <span>
              {formatTime(todayGoalSeconds)} / {formatTime(goalDailySeconds)}
            </span>
            <span>{dailyPercent}%</span>
          </div>
        </div>

        {/* 오늘 집중 포인트 – Deep Work 특수 처리 없이, 상위 태그만 */}
        <div className="border-t border-slate-700 pt-3 md:border-t-0 md:border-l md:pl-4 md:ml-4">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            오늘 집중 포인트
          </div>
          {!hasAnyToday ? (
            <p className="text-xs text-slate-400">
              오늘 목표 태그로 기록된 시간이 아직 없습니다.
            </p>
          ) : !topTodayTagEntry ? (
            <p className="text-xs text-slate-400">
              오늘 데이터는 있지만 태그가 없습니다.
            </p>
          ) : (
            (() => {
              const [topTagId, topSec] = topTodayTagEntry;
              const topPercentOfToday =
                todayGoalSeconds > 0
                  ? Math.round((topSec / todayGoalSeconds) * 100)
                  : 0;
              return (
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>가장 많이 집중한 태그</span>
                    <span className="flex items-center gap-1 font-mono">
                      <span
                        className={`w-2 h-2 rounded-full ${getTagColorClass(
                          topTagId
                        )}`}
                      />
                      <span className="text-slate-100">
                        {getTagLabel(topTagId)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>오늘 이 태그에 사용한 시간</span>
                    <span className="font-mono">
                      {formatTime(topSec)} ({topPercentOfToday}%)
                    </span>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* 3. 최근 7일 트렌드 (목표 태그 기준) */}
      <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">최근 7일 트렌드</h2>
          <span className="text-xs text-slate-400">
            목표 태그 기준 · 일별 총 시간
          </span>
        </div>

        {!hasAnyTrend ? (
          <p className="text-sm text-slate-300">
            최근 7일 동안 목표 태그로 기록된 시간이 없습니다.
          </p>
        ) : (
          <div className="space-y-1.5">
            {last7DaysData.map((d) => {
              const ratio =
                maxTrendSec > 0 ? d.seconds / maxTrendSec : 0;
              const widthPercent = Math.max(
                8,
                Math.round(ratio * 100)
              );
              return (
                <div
                  key={d.dateKey}
                  className="flex items-center gap-2 text-xs"
                >
                  <div className="w-6 text-right text-slate-400">
                    {d.label}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <div className="w-20 text-right font-mono text-slate-300">
                    {d.seconds === 0
                      ? "-"
                      : formatTime(d.seconds)
                          .replace(/^00:/, "")
                          .replace(/^0/, "")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
