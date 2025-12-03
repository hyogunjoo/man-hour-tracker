import React, { useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Chart.js 기본 등록
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// 날짜 포맷 yyyy-MM-dd
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 초 → "x시간 y분"
function formatDuration(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}시간 ${minutes}분`;
  if (hours) return `${hours}시간`;
  if (minutes) return `${minutes}분`;
  return '0분';
}

// 세션에서 표시용 라벨 뽑기: 태그 label → 태그 name → 태그 ID → name/title → 기타
function getSessionLabel(session, tagNameById) {
  const tag = session.tag;

  // 태그가 없으면 name/title/기타
  if (tag == null) {
    return session.name || session.title || '기타';
  }

  // tag가 원시값(id)인 경우
  if (typeof tag === 'string' || typeof tag === 'number') {
    const keyVariants = [tag, String(tag)];
    for (const k of keyVariants) {
      const v = tagNameById.get(k);
      if (v) return v;
    }
    return String(tag);
  }

  // tag가 객체인 경우 { id, label, name, ... }
  if (typeof tag === 'object') {
    if (tag.label) return tag.label;
    if (tag.name) return tag.name;

    if (tag.id != null) {
      const keyVariants = [tag.id, String(tag.id)];
      for (const k of keyVariants) {
        const v = tagNameById.get(k);
        if (v) return v;
      }
      return String(tag.id);
    }
  }

  return session.name || session.title || '기타';
}

// 세션 길이 분포용 구간 정의 (분 단위)
const DURATION_BINS = [
  { label: '0–15분', min: 0, max: 15 },
  { label: '15–30분', min: 15, max: 30 },
  { label: '30–60분', min: 30, max: 60 },
  { label: '60–90분', min: 60, max: 90 },
  { label: '90분 이상', min: 90, max: Infinity },
];

const Report = ({ sessions = [] }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // 실제로 적용된 조회 기간 (버튼 눌렀을 때 확정)
  const [appliedRange, setAppliedRange] = useState({
    start: null,
    end: null,
  });

  const handleApplyRange = () => {
    if (!startDate || !endDate) {
      alert('시작일과 종료일을 모두 선택해주세요.');
      return;
    }

    if (endDate < startDate) {
      alert('종료일이 시작일보다 빠를 수 없습니다.');
      return;
    }

    setAppliedRange({
      start: startDate,
      end: endDate,
    });
  };

  // sessions props가 비어 있으면 localStorage에서 timeflow_sessions_v1 읽어오기
  const resolvedSessions = useMemo(() => {
    if (Array.isArray(sessions) && sessions.length > 0) {
      return sessions;
    }

    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = window.localStorage.getItem('timeflow_sessions_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read timeflow_sessions_v1 from localStorage', e);
      return [];
    }
  }, [sessions]);

  // 태그 정보 로드 (timeflow_tags_v1): id → label/name 매핑
  const tags = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('timeflow_tags_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read timeflow_tags_v1 from localStorage', e);
      return [];
    }
  }, []);

  const tagNameById = useMemo(() => {
    const map = new Map();
    tags.forEach((t) => {
      if (!t || t.id == null) return;
      const label = t.label ?? t.name ?? '';
      if (!label) return;

      // 숫자/문자열 두 가지 키로 모두 저장
      map.set(t.id, label);
      map.set(String(t.id), label);
    });
    return map;
  }, [tags]);

  // 적용된 기간 기준으로 세션 필터링
  const filteredSessions = useMemo(() => {
    if (!appliedRange.start || !appliedRange.end) return [];

    const start = new Date(appliedRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(appliedRange.end);
    end.setHours(23, 59, 59, 999);

    return resolvedSessions.filter((session) => {
      if (!session.startedAt) return false;
      const startedAt = new Date(session.startedAt);
      return startedAt >= start && startedAt <= end;
    });
  }, [resolvedSessions, appliedRange.start, appliedRange.end]);

  const totalSeconds = useMemo(
    () =>
      filteredSessions.reduce(
        (sum, s) => sum + (s.durationSeconds || 0),
        0
      ),
    [filteredSessions]
  );

  const hasAppliedRange = appliedRange.start && appliedRange.end;
  const hasResult =
    hasAppliedRange && filteredSessions.length > 0;

  // Pie 차트용 데이터: "태그 라벨" 기준 총 시간
  const pieData = useMemo(() => {
    if (!filteredSessions.length) return null;

    const colorPalette = [
      '#4F46E5',
      '#22C55E',
      '#F97316',
      '#EC4899',
      '#06B6D4',
      '#EAB308',
      '#8B5CF6',
      '#F43F5E',
      '#14B8A6',
      '#3B82F6',
    ];

    const byLabel = new Map();

    filteredSessions.forEach((session) => {
      const label = getSessionLabel(session, tagNameById);
      const duration = session.durationSeconds || 0;

      if (!byLabel.has(label)) {
        byLabel.set(label, 0);
      }
      byLabel.set(label, byLabel.get(label) + duration);
    });

    const labels = Array.from(byLabel.keys());
    const data = labels.map((label) => byLabel.get(label));

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map(
            (_, idx) => colorPalette[idx % colorPalette.length]
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [filteredSessions, tagNameById]);

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 10,
            font: {
              size: 11,
              family:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"',
            },
            color: '#E5E7EB',
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage =
                totalSeconds > 0
                  ? ((value / totalSeconds) * 100).toFixed(1)
                  : '0.0';
              return `${label}: ${formatDuration(
                value
              )} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [totalSeconds]
  );

  // 태그별 집계 (세션 수 + 총 시간)
  const tagAggregates = useMemo(() => {
    if (!filteredSessions.length) return null;

    const map = new Map(); // label → { count, totalSeconds }

    filteredSessions.forEach((session) => {
      const label = getSessionLabel(session, tagNameById);
      const duration = session.durationSeconds || 0;

      if (!map.has(label)) {
        map.set(label, { count: 0, totalSeconds: 0 });
      }
      const agg = map.get(label);
      agg.count += 1;
      agg.totalSeconds += duration;
    });

    const labels = Array.from(map.keys());
    const counts = labels.map((label) => map.get(label).count);
    const avgMinutes = labels.map((label) => {
      const { count, totalSeconds } = map.get(label);
      if (!count) return 0;
      return Math.round(totalSeconds / count / 60);
    });

    return { labels, counts, avgMinutes };
  }, [filteredSessions, tagNameById]);

  // 카드 2: 태그별 세션 횟수 Bar 차트
  const tagCountBarData = useMemo(() => {
    if (!tagAggregates) return null;
    return {
      labels: tagAggregates.labels,
      datasets: [
        {
          label: '세션 횟수',
          data: tagAggregates.counts,
          borderWidth: 0,
          borderRadius: 6,
          backgroundColor: '#4F46E5',
        },
      ],
    };
  }, [tagAggregates]);

  const tagCountBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw}회`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 11,
            },
            color: '#9CA3AF',
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: {
              size: 11,
            },
            color: '#9CA3AF',
            callback: (value) => `${value}회`,
          },
          grid: {
            color: '#1F2933',
          },
        },
      },
    }),
    []
  );

  // 카드 3: 태그별 평균 세션 길이 Bar 차트
  const tagAvgDurationBarData = useMemo(() => {
    if (!tagAggregates) return null;
    return {
      labels: tagAggregates.labels,
      datasets: [
        {
          label: '평균 세션 길이(분)',
          data: tagAggregates.avgMinutes,
          borderWidth: 0,
          borderRadius: 6,
          backgroundColor: '#22C55E',
        },
      ],
    };
  }, [tagAggregates]);

  const tagAvgDurationBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw}분`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 11,
            },
            color: '#9CA3AF',
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 5,
            font: {
              size: 11,
            },
            color: '#9CA3AF',
            callback: (value) => `${value}분`,
          },
          grid: {
            color: '#1F2933',
          },
        },
      },
    }),
    []
  );

  // 카드 4: 세션 길이 분포 Bar 차트
  const durationDistBarData = useMemo(() => {
    if (!filteredSessions.length) return null;

    const counts = new Array(DURATION_BINS.length).fill(0);

    filteredSessions.forEach((session) => {
      const minutes = (session.durationSeconds || 0) / 60;
      for (let i = 0; i < DURATION_BINS.length; i += 1) {
        const bin = DURATION_BINS[i];
        if (minutes >= bin.min && minutes < bin.max) {
          counts[i] += 1;
          break;
        }
      }
    });

    const labels = DURATION_BINS.map((b) => b.label);

    return {
      labels,
      datasets: [
        {
          label: '세션 수',
          data: counts,
          borderWidth: 0,
          borderRadius: 6,
          backgroundColor: '#F97316',
        },
      ],
    };
  }, [filteredSessions]);

  const durationDistBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw}회`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 11,
            },
            color: '#9CA3AF',
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: {
              size: 11,
            },
            color: '#9CA3AF',
            callback: (value) => `${value}회`,
          },
          grid: {
            color: '#1F2933',
          },
        },
      },
    }),
    []
  );

  return (
    <div className="h-full w-full flex flex-col gap-4 p-4 sm:p-6">
      {/* 헤더 영역 - Timer 스타일 다크 카드 */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-50">
            Report
          </h1>
          <p className="text-sm text-slate-400">
            특정 기간을 선택해 작업 기록을 분석해 보세요.
          </p>
          {hasAppliedRange && (
            <p className="text-xs text-slate-400">
              선택된 기간: {formatDate(appliedRange.start)} ~{' '}
              {formatDate(appliedRange.end)} · 세션{' '}
              {filteredSessions.length}개 · 총{' '}
              {formatDuration(totalSeconds)}
            </p>
          )}
        </div>

        {/* 날짜 선택 + 버튼 영역 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="mb-1 text-xs font-medium text-slate-400">
                시작일
              </span>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                className="w-[140px] rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-50 placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-slate-900 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="mt-5 text-xs text-slate-500">~</span>
            <div className="flex flex-col">
              <span className="mb-1 text-xs font-medium text-slate-400">
                종료일
              </span>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                className="w-[140px] rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-50 placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-slate-900 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRange}
            className="mt-1 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-950 sm:mt-5"
          >
            조회
          </button>
        </div>
      </div>

      {/* 차트/인사이트 영역 - 4카드 그리드 */}
      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
        {hasResult ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 카드 1: 파이차트 (항목 비율) */}
            <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-50">
                  항목 비율
                </h2>
                <span className="text-[11px] text-slate-400">
                  전체 시간 기준
                </span>
              </div>
              <div className="flex-1 rounded-md bg-slate-900 p-2">
                {pieData ? (
                  <div className="h-56">
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    표시할 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 카드 2: 태그별 세션 횟수 */}
            <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-50">
                  항목별 세션 횟수
                </h2>
                <span className="text-[11px] text-slate-400">
                  얼마나 자주 했는지
                </span>
              </div>
              <div className="flex-1 rounded-md bg-slate-900 p-2">
                {tagCountBarData ? (
                  <div className="h-56">
                    <Bar
                      data={tagCountBarData}
                      options={tagCountBarOptions}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    표시할 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 카드 3: 태그별 평균 세션 길이 */}
            <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-50">
                  항목별 평균 세션 길이
                </h2>
                <span className="text-[11px] text-slate-400">
                  한 번 시작했을 때 유지 시간
                </span>
              </div>
              <div className="flex-1 rounded-md bg-slate-900 p-2">
                {tagAvgDurationBarData ? (
                  <div className="h-56">
                    <Bar
                      data={tagAvgDurationBarData}
                      options={tagAvgDurationBarOptions}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    표시할 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 카드 4: 세션 길이 분포 */}
            <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-50">
                  세션 길이 분포
                </h2>
                <span className="text-[11px] text-slate-400">
                  짧게 자주 vs 길게 몰입
                </span>
              </div>
              <div className="flex-1 rounded-md bg-slate-900 p-2">
                {durationDistBarData ? (
                  <div className="h-56">
                    <Bar
                      data={durationDistBarData}
                      options={durationDistBarOptions}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    표시할 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
            {hasAppliedRange ? (
              <p>선택한 기간의 데이터가 없습니다.</p>
            ) : (
              <>
                <p>상단에서 기간을 선택한 후 조회 버튼을 눌러 주세요.</p>
                <p>선택한 기간의 작업 기록을 기반으로 4개의 인사이트 카드가 표시됩니다.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
