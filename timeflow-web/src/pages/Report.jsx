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
  PointElement,
  LineElement,
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

// Chart.js 기본 등록
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

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

  // 적용된 기간 기준으로 세션 필터링
  const filteredSessions = useMemo(() => {
    if (!appliedRange.start || !appliedRange.end) return [];

    const start = new Date(appliedRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(appliedRange.end);
    end.setHours(23, 59, 59, 999);

    return sessions.filter((session) => {
      if (!session.startedAt) return false;
      const startedAt = new Date(session.startedAt);
      return startedAt >= start && startedAt <= end;
    });
  }, [sessions, appliedRange.start, appliedRange.end]);

  const totalSeconds = useMemo(
    () =>
      filteredSessions.reduce(
        (sum, s) => sum + (s.durationSeconds || 0),
        0
      ),
    [filteredSessions]
  );

  // 날짜 포맷 yyyy-MM-dd
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 초 → "x시간 y분"
  const formatDuration = (seconds) => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours && minutes) return `${hours}시간 ${minutes}분`;
    if (hours) return `${hours}시간`;
    if (minutes) return `${minutes}분`;
    return '0분';
  };

  const hasResult =
    appliedRange.start && appliedRange.end && filteredSessions.length > 0;

  // 공통 색상 팔레트 (Timer와 느낌 비슷한 파스텔 톤 가정)
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

  // Pie 차트용 데이터: 태그(또는 이름)별 총 시간
  const pieData = useMemo(() => {
    if (!filteredSessions.length) return null;

    const byTag = new Map();

    filteredSessions.forEach((session) => {
      const key =
        session.tag ||
        session.name ||
        session.title ||
        '기타';
      const duration = session.durationSeconds || 0;

      if (!byTag.has(key)) {
        byTag.set(key, 0);
      }
      byTag.set(key, byTag.get(key) + duration);
    });

    const labels = Array.from(byTag.keys());
    const data = labels.map((label) => byTag.get(label));

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
  }, [filteredSessions]);

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
            },
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

  // Line 차트용 데이터: 날짜별 총 작업 시간 (시간 단위)
  const lineData = useMemo(() => {
    if (!filteredSessions.length) return null;

    const byDate = new Map(); // key: yyyy-MM-dd, value: seconds

    filteredSessions.forEach((session) => {
      const d = new Date(session.startedAt);
      const key = formatDate(d);
      const duration = session.durationSeconds || 0;

      if (!byDate.has(key)) {
        byDate.set(key, 0);
      }
      byDate.set(key, byDate.get(key) + duration);
    });

    const labels = Array.from(byDate.keys()).sort();
    const hoursData = labels.map(
      (label) => (byDate.get(label) || 0) / 3600
    );

    return {
      labels,
      datasets: [
        {
          label: '총 작업 시간',
          data: hoursData,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [filteredSessions]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw || 0;
              const hours = Math.floor(value);
              const minutes = Math.round((value - hours) * 60);

              if (hours && minutes)
                return `${hours}시간 ${minutes}분`;
              if (hours) return `${hours}시간`;
              if (minutes) return `${minutes}분`;
              return '0분';
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 11,
            },
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
            callback: (value) => `${value}시간`,
          },
          grid: {
            color: '#E5E7EB',
          },
        },
      },
    }),
    []
  );

  const hasAppliedRange = appliedRange.start && appliedRange.end;

  return (
    <div className="h-full w-full flex flex-col gap-4 p-4 sm:p-6">
      {/* 헤더 영역 */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-900">
            Report
          </h1>
          <p className="text-sm text-slate-500">
            특정 기간을 선택해 작업 기록을 분석해 보세요.
          </p>
          {hasAppliedRange && (
            <p className="text-xs text-slate-500">
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
              <span className="mb-1 text-xs font-medium text-slate-500">
                시작일
              </span>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                className="w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="mt-5 text-xs text-slate-400">~</span>
            <div className="flex flex-col">
              <span className="mb-1 text-xs font-medium text-slate-500">
                종료일
              </span>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="YYYY-MM-DD"
                className="w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRange}
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 sm:mt-5"
          >
            조회
          </button>
        </div>
      </div>

      {/* 차트/인사이트 영역 */}
      <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {hasResult ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 카드 1: 파이차트 (항목 비율) */}
            <div className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  항목 비율
                </h2>
                <span className="text-[11px] text-slate-400">
                  Pie Chart
                </span>
              </div>
              <div className="flex-1 rounded-md bg-white/70 p-2">
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

            {/* 카드 2: 라인차트 (일자별 총 작업시간) */}
            <div className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  일자별 총 작업시간
                </h2>
                <span className="text-[11px] text-slate-400">
                  Line Chart
                </span>
              </div>
              <div className="flex-1 rounded-md bg-white/70 p-2">
                {lineData ? (
                  <div className="h-56">
                    <Line data={lineData} options={lineOptions} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    표시할 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 카드 3: 향후 확장용 (예: 항목별 평균 세션 길이 등) */}
            <div className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  추가 인사이트 1
                </h2>
                <span className="text-[11px] text-slate-400">
                  Reserved
                </span>
              </div>
              <div className="flex-1 rounded-md bg-white/70 p-2">
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  추후 다른 시각화(예: 항목별 평균 세션 길이)를 넣을 자리입니다.
                </div>
              </div>
            </div>

            {/* 카드 4: 향후 확장용 (예: 시간대별 작업 패턴 등) */}
            <div className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  추가 인사이트 2
                </h2>
                <span className="text-[11px] text-slate-400">
                  Reserved
                </span>
              </div>
              <div className="flex-1 rounded-md bg-white/70 p-2">
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  추후 다른 시각화(예: 시간대별 작업 패턴)를 넣을 자리입니다.
                </div>
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
