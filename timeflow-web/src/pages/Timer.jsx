// src/pages/Timer.jsx
import { useMemo } from "react";
import { useTimer } from "../timer/TimerContext";
import { useSettings } from "../settings/SettingsContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer, // 추가
} from "recharts";

// HH:MM:SS 포맷
function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// "2시간 30분" 형식 포맷 (초 → 시/분)
function formatDurationHM(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const totalMinutes = Math.round(sec / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  if (m > 0) return `${m}분`;
  return "0시간";
}

// YYYY-MM-DD (로컬 타임 기준)
function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 최근 7일 날짜 배열 (과거 → 오늘 순)
function buildLast7Days() {
  const today = new Date();
  const list = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i
    );
    list.push(d);
  }
  return list;
}

export default function TimerPage() {
  const {
    sessions = [],
    isRunning,
    elapsedSeconds,
    currentTagId,
    setCurrentTagId,
    start,
    pause,
    stopAndSave,
  } = useTimer();

  const {
    tags = [],
    dailyGoalHours,
    masterGoalName,
    masterGoalHours,
    masterGoalTagIds = [],
  } = useSettings();

  // 모든 태그 ID를 문자열로 취급
  const masterTagSet = useMemo(
    () => new Set((masterGoalTagIds || []).map((id) => String(id))),
    [masterGoalTagIds]
  );

  // currentTagId도 문자열로 통일
  const currentTagIdStr =
    currentTagId === null || currentTagId === undefined || currentTagId === ""
      ? ""
      : String(currentTagId);

  const currentTag =
    tags.find((t) => String(t.id) === currentTagIdStr) || null;

  const isTagSelected = currentTagIdStr !== "";

  // 오늘 날짜 키
  const today = useMemo(() => {
    const now = new Date();
    return toDateKey(now);
  }, []);

  // 세션 기반 누적/트렌드 계산
  const {
    masteryTotalSeconds,
    todayGoalSecondsWithRunning,
    trend7Days,
  } = useMemo(() => {
    const sessionsArray = Array.isArray(sessions) ? sessions : [];

    const last7Days = buildLast7Days();
    const dayKeys = last7Days.map(toDateKey);

    const bucket = new Map();
    for (const key of dayKeys) bucket.set(key, 0);

    let masteryTotal = 0;
    let todayTotal = 0;

    for (const s of sessionsArray) {
      if (!s) continue;
      const tagIdRaw = s.tag?.id ?? s.tagId ?? s.tag ?? null;
      const tagIdStr = tagIdRaw == null ? null : String(tagIdRaw);

      const filterByMaster =
        masterTagSet.size === 0 ||
        (tagIdStr !== null && masterTagSet.has(tagIdStr));

      if (!filterByMaster) continue;

      const endedAt = s.endedAt ?? s.finishedAt ?? s.stoppedAt ?? s.startedAt;
      if (!endedAt) continue;

      const seconds = Math.max(
        0,
        Number.isFinite(s.durationSeconds)
          ? Math.floor(s.durationSeconds)
          : 0
      );

      masteryTotal += seconds;

      const dayKey = toDateKey(endedAt);
      if (bucket.has(dayKey)) {
        bucket.set(dayKey, bucket.get(dayKey) + seconds);
      }

      if (dayKey === today) {
        todayTotal += seconds;
      }
    }

    // 실행 중 세션도 포함
    let runningExtra = 0;
    if (isRunning) {
      const runningTagIdStr =
        currentTagId == null || currentTagId === ""
          ? null
          : String(currentTagId);
      if (masterTagSet.size === 0) {
        runningExtra = elapsedSeconds || 0;
      } else if (runningTagIdStr && masterTagSet.has(runningTagIdStr)) {
        runningExtra = elapsedSeconds || 0;
      }
    }

    const todayWithRunning = todayTotal + runningExtra;

    const trendData = buildLast7Days().map((d) => {
      const key = toDateKey(d);
      const baseSeconds = bucket.get(key) ?? 0;
      const isToday = key === today;
      const valueSeconds = isToday ? todayWithRunning : baseSeconds;
      return {
        dateKey: key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        seconds: valueSeconds,
        hours: valueSeconds / 3600,
      };
    });

    return {
      masteryTotalSeconds: masteryTotal + runningExtra,
      todayGoalSecondsWithRunning: todayWithRunning,
      trend7Days: trendData,
    };
  }, [
    sessions,
    masterTagSet,
    today,
    isRunning,
    elapsedSeconds,
    currentTagId,
  ]);

  // Mastery Goal 진행도
  const masteryGoalSeconds = (masterGoalHours || 0) * 3600;
  const masteryProgress =
    masteryGoalSeconds > 0
      ? Math.min(1, masteryTotalSeconds / masteryGoalSeconds)
      : 0;

  // 오늘 목표 진행도
  const dailyGoalSeconds = (dailyGoalHours || 0) * 3600;
  const todayProgress =
    dailyGoalSeconds > 0
      ? Math.min(1, todayGoalSecondsWithRunning / dailyGoalSeconds)
      : 0;

  // 최근 세션 10개
  const recentSessions = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions.slice() : [];
    list.sort((a, b) => {
      const ta = new Date(a.startedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.startedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
    return list.slice(0, 10);
  }, [sessions]);

  // 태그 변경 핸들러 (문자열로 저장)
  const handleTagChange = (e) => {
    if (!setCurrentTagId) return;
    const value = e.target.value;
    if (!value) {
      setCurrentTagId(null);
    } else {
      setCurrentTagId(value); // 무조건 문자열
    }
  };

  const handleStart = () => {
    if (!isTagSelected) {
      window.alert("타이머를 시작하기 전에 먼저 태그를 선택해 주세요.");
      return;
    }
    if (!start) return;
    start();
  };

  const handlePause = () => {
    if (!pause) return;
    pause();
  };

  const handleStopAndSave = () => {
    if (!stopAndSave) return;
    stopAndSave();
  };

  const masteryTitle =
    masterGoalName && masterGoalName.trim().length > 0
      ? masterGoalName
      : "Mastery Goal";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* 좌측: 타이머 + 세션 리스트 */}
          <section className="flex flex-col gap-4">
            {/* 타이머 카드 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-slate-50">
                    Mastery Timer
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    한 번에 한 가지 태그에 시간을 쌓아서, 장기 목표를 향해
                    전진합니다.
                  </p>
                </div>
              </div>

              {/* 현재 태그 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">현재 태그</span>
                <select
                  value={currentTagIdStr}
                  onChange={handleTagChange}
                  disabled={isRunning} // 타이머 실행 중에는 수정 불가
                  className={
                    "flex-1 text-xs rounded-md border px-2 py-1.5 text-slate-100 focus:outline-none focus:ring-1 " +
                    (isRunning
                      ? "bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-slate-800 border-slate-600 focus:ring-blue-500")
                  }
                >
                  <option value="">태그 선택 없음</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={String(tag.id)}>
                      {tag.label}
                    </option>
                  ))}
                </select>
                {currentTag && (
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full border border-slate-600 text-[11px]"
                    style={{
                      backgroundColor: `${currentTag.color}33`,
                      borderColor: currentTag.color || "#64748b",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: currentTag.color }}
                    />
                    {currentTag.label}
                  </span>
                )}
              </div>

              {/* 시간 표시 */}
              <div className="flex flex-col items-center py-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Elapsed Time
                </div>
                <div className="text-4xl md:text-5xl font-mono text-slate-50 tracking-tight">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              {/* 컨트롤 버튼 */}
              <div className="flex items-center justify-center gap-3">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    className={
                      "px-4 py-2 rounded-full text-xs font-semibold " +
                      (isTagSelected
                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed")
                    }
                  >
                    Start
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400"
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStopAndSave}
                  className="px-4 py-2 rounded-full bg-slate-800 text-slate-100 text-xs font-semibold border border-slate-600 hover:bg-slate-700"
                >
                  Stop &amp; Save
                </button>
              </div>
            </div>

            {/* 최근 세션 목록 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  최근 세션
                </h2>
                <span className="text-[11px] text-slate-500">
                  최근 {recentSessions.length}개
                </span>
              </div>
              {recentSessions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  아직 저장된 세션이 없습니다. 태그를 선택하고 타이머를 시작한
                  뒤 Stop &amp; Save를 눌러 보세요.
                </p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-auto pr-1">
                  {recentSessions.map((s) => {
                    const tagIdRaw = s.tag?.id ?? s.tagId ?? s.tag ?? null;
                    const tagIdStr =
                      tagIdRaw == null ? null : String(tagIdRaw);
                    const tag =
                      tags.find((t) => String(t.id) === tagIdStr) || null;

                    const started = s.startedAt
                      ? new Date(s.startedAt)
                      : null;
                    const ended = s.endedAt ? new Date(s.endedAt) : null;
                    const duration = Math.max(
                      0,
                      Number.isFinite(s.durationSeconds)
                        ? Math.floor(s.durationSeconds)
                        : 0
                    );

                    const label =
                      tag?.label ||
                      (tagIdStr != null ? tagIdStr : "태그 없음");

                    const timeRange =
                      started && ended
                        ? `${started.toTimeString().slice(0, 5)} ~ ${ended
                            .toTimeString()
                            .slice(0, 5)}`
                        : started
                        ? `${started.toTimeString().slice(0, 5)} ~ …`
                        : "시간 정보 없음";

                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-100">
                            {label}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {timeRange}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-200">
                          {formatTime(duration)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* 우측: Mastery Goal + 7일 트렌드 */}
          <section className="flex flex-col gap-4">
            {/* Mastery Goal 카드 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    {masteryTitle}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    선택한 태그들의 누적 시간을 기준으로 장기 목표 달성률을
                    보여줍니다.
                  </p>
                </div>
              </div>

              {/* 목표/달성 요약 */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1">
                    누적 시간
                  </div>
                  <div className="text-lg font-mono text-slate-50">
                    {formatTime(masteryTotalSeconds)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 mb-1">
                    목표 시간
                  </div>
                  <div className="text-sm text-slate-100">
                    {masterGoalHours || 0} 시간
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {masterGoalHours
                      ? `달성률 ${
                          Math.round(masteryProgress * 1000) / 10
                        }%`
                      : "목표 시간이 설정되어 있지 않습니다."}
                  </div>
                </div>
              </div>

              {/* 진행 바 */}
              <div className="mt-2">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(masteryProgress * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[11px] text-slate-500">
                  <span>0</span>
                  <span>{masterGoalHours || 0}h</span>
                </div>
              </div>

              {/* 오늘 목표 게이지 */}
              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400">
                    오늘 목표 달성도
                    {dailyGoalHours ? ` (목표 ${dailyGoalHours}h)` : ""}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">
                    {formatTime(todayGoalSecondsWithRunning)}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(todayProgress * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 최근 7일 트렌드 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  최근 7일 트렌드
                </h2>
                <span className="text-[11px] text-slate-500">
                  Mastery Goal 태그 기준
                </span>
              </div>

              {/* 스크롤 없애고 반응형으로 조정 */}
              <div className="w-full overflow-x-hidden">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={trend7Days}
                    margin={{ top: 10, right: 16, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={{ stroke: "#4b5563" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={{ stroke: "#4b5563" }}
                      tickLine={false}
                      // hours(숫자)를 받아서 "2시간 30분" 형식으로 표시
                      tickFormatter={(v) => formatDurationHM(v * 3600)}
                    />
                    <Tooltip
                      formatter={(value) => {
                        // value는 hours 단위 → seconds로 변환 후 포맷
                        return [formatDurationHM(value * 3600), "총 시간"];
                      }}
                      labelFormatter={(label, payload) => {
                        if (!payload || !payload[0]) return label;
                        const dKey = payload[0].payload.dateKey;
                        return `${label} (${dKey})`;
                      }}
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        fontSize: 11,
                      }}
                      itemStyle={{ color: "#e5e7eb" }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    {dailyGoalHours > 0 && (
                      <ReferenceLine
                        y={dailyGoalHours}
                        stroke="#4b5563"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
