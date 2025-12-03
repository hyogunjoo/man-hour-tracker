// src/pages/Settings.jsx
import { useState, useRef } from "react";
import { useSettings } from "../settings/SettingsContext";

const SESSIONS_KEY = "timeflow_sessions_v1";
const RUN_STATE_KEY = "timeflow_run_state_v1";
const TAGS_KEY = "timeflow_tags_v1";
const SETTINGS_KEY = "timeflow_settings_v1";

export default function Settings() {
  const settings = useSettings();

const {
  tags = [],
  dailyGoalHours,
  masterGoalName,
  masterGoalHours,
  masterGoalTagIds,
  setDailyGoalHours,
  setMasterGoalName,
  setMasterGoalHours,
  toggleMasterGoalTag,
} = settings;

  const [backupMessage, setBackupMessage] = useState("");
  const fileInputRef = useRef(null);

  // 값 변경 핸들러들: 컨텍스트 setter만 호출
  const handleDailyGoalChange = (e) => {
    if (!setDailyGoalHours) return;
    const v = Number(e.target.value);
    setDailyGoalHours(Number.isNaN(v) || v < 0 ? 0 : v);
  };

  const handleMasterGoalHoursChange = (e) => {
    if (!setMasterGoalHours) return;
    const v = Number(e.target.value);
    setMasterGoalHours(Number.isNaN(v) || v < 0 ? 0 : v);
  };

  const handleToggleMasterGoalTag = (tagId) => {
    if (!toggleMasterGoalTag) return;
    toggleMasterGoalTag(tagId);
  };

  // ---------- 백업 (세션 + 태그 + 설정) ----------
  const handleExportBackup = () => {
    try {
      const rawSessions = localStorage.getItem(SESSIONS_KEY);
      const sessions = rawSessions ? JSON.parse(rawSessions) : [];

      const rawTags = localStorage.getItem(TAGS_KEY);
      const tagsFromStorage = rawTags ? JSON.parse(rawTags) : tags;

      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      const settingsFromStorage = rawSettings
        ? JSON.parse(rawSettings)
        : {
            dailyGoalHours,
            masterGoalName,
            masterGoalHours,
            masterGoalTagIds,
          };

      const backup = {
        version: 3,
        exportedAt: new Date().toISOString(),
        sessions,
        tags: tagsFromStorage,
        settings: settingsFromStorage,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timeflow-backup-${backup.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setBackupMessage("백업 파일을 다운로드했습니다.");
    } catch (e) {
      console.error("백업 중 오류:", e);
      setBackupMessage("백업 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // ---------- 임포트 (세션 + 태그 + 설정) ----------
  const handleImportFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const parsed = JSON.parse(text);

        if (!parsed || !Array.isArray(parsed.sessions)) {
          setBackupMessage(
            "알 수 없는 백업 형식입니다. sessions 배열이 필요합니다."
          );
          return;
        }

        const sessionsFromBackup = parsed.sessions;
        const tagsFromBackup = Array.isArray(parsed.tags)
          ? parsed.tags
          : null;
        const settingsFromBackup =
          parsed.settings && typeof parsed.settings === "object"
            ? parsed.settings
            : null;

        const cleanedSessions = sessionsFromBackup.map((s) => ({
          id: String(s.id),
          tag: s.tag ?? null,
          startedAt: String(s.startedAt),
          endedAt: String(s.endedAt),
          durationSeconds: Math.max(
            0,
            Number.isFinite(s.durationSeconds)
              ? Math.floor(s.durationSeconds)
              : 0
          ),
        }));

        // 세션 교체
        localStorage.setItem(
          SESSIONS_KEY,
          JSON.stringify(cleanedSessions)
        );

        // 태그 교체
        if (tagsFromBackup) {
          localStorage.setItem(TAGS_KEY, JSON.stringify(tagsFromBackup));
        }

        // 설정 교체
        if (settingsFromBackup) {
          localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(settingsFromBackup)
          );
        }

        // 런타임 타이머 상태 초기화
        localStorage.setItem(
          RUN_STATE_KEY,
          JSON.stringify({
            isRunning: false,
            baseSeconds: 0,
            startedAt: null,
          })
        );

        setBackupMessage(
          `세션 ${cleanedSessions.length}개${
            tagsFromBackup ? `, 태그 ${tagsFromBackup.length}개` : ""
          }${
            settingsFromBackup ? ", 설정도 함께 복원했습니다." : ""
          } 새로고침 후 적용됩니다.`
        );

        setTimeout(() => {
          window.location.replace("/");
        }, 800);
      } catch (e) {
        console.error("임포트 중 오류:", e);
        setBackupMessage(
          "임포트 중 오류가 발생했습니다. 파일 내용과 콘솔을 확인하세요."
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-100 mb-4">설정</h1>

      <div className="space-y-6">        

        {/* 오늘 목표 시간 */}
        <section className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            오늘 목표 시간
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            하루에 얼마나 투자하고 싶은지 기준 시간을 설정합니다. Timer 화면의
            목표 게이지에 사용됩니다.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={0.5}
              value={dailyGoalHours ?? 0}
              onChange={handleDailyGoalChange}
              className="w-24 rounded-md bg-slate-800 border border-slate-600 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-300">시간 / 하루</span>
          </div>
        </section>

        {/* Mastery Goal */}
        <section className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            Mastery Goal 설정
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            일만 시간의 법칙처럼, 장기적으로 도달하고 싶은 목표를 설정합니다.
            이 목표에 포함할 태그를 선택하면 Timer 화면에서 진척도를 볼 수
            있습니다.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                목표 이름
              </label>
              <input
                type="text"
                value={masterGoalName ?? ""}
                onChange={(e) =>
                  setMasterGoalName && setMasterGoalName(e.target.value)
                }
                placeholder="예: 풀스택 개발자, 영어 회화, 투자 공부"
                className="w-full rounded-md bg-slate-800 border border-slate-600 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                목표 총 시간
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={masterGoalHours ?? 0}
                  onChange={handleMasterGoalHoursChange}
                  className="w-28 rounded-md bg-slate-800 border border-slate-600 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-300">시간</span>
                <span className="text-[11px] text-slate-500">
                  10,000시간 = 하루 3시간씩 약 10년
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                이 목표에 포함할 태그
              </label>
              {tags.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  아직 태그가 없습니다. Tags 페이지에서 태그를 먼저
                  만들어주세요.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const idStr = String(tag.id);
                    const isOn =
                      (masterGoalTagIds || []).map(String).includes(idStr);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleMasterGoalTag(tag.id)}
                        className={
                          "px-2 py-1 rounded-full text-[11px] border transition-colors " +
                          (isOn
                            ? "bg-blue-500/20 border-blue-400 text-blue-100"
                            : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700")
                        }
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                여기서 선택한 태그로만 Mastery Goal 진척도가 계산됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 백업 / 임포트 */}
        <section className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            데이터 백업 / 가져오기
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            로컬에 저장된 세션 데이터를 JSON 파일로 백업하거나,
            기존 백업 파일을 가져올 수 있습니다. 태그와 설정도 함께 포함됩니다.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-1.5 text-xs rounded-md bg-slate-200 text-slate-900 font-semibold hover:bg-white"
            >
              백업 파일 다운로드
            </button>

            <button
              type="button"
              onClick={handleImportClick}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-500 text-slate-100 hover:bg-slate-800"
            >
              백업 파일에서 가져오기
            </button>

            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              className="hidden"
            />
          </div>

          {backupMessage && (
            <p className="mt-2 text-[11px] text-slate-400">{backupMessage}</p>
          )}

          <p className="mt-2 text-[11px] text-slate-500">
            가져오기를 실행하면 기존 세션은 백업 파일의 내용으로 완전히
            교체되며, 현재 진행 중인 타이머 상태는 초기화됩니다.
            태그와 설정이 포함된 백업이라면 함께 복원되며,
            한 번 새로고침 후 앱 전체에 반영됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
