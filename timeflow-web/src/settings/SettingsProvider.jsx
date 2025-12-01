// src/settings/SettingsProvider.jsx
import { useState, useEffect } from "react";
import { SettingsContext } from "./SettingsContext";

const SETTINGS_KEY = "timeflow_settings_v1";
const TAGS_KEY = "timeflow_tags_v1";

// 기본 태그(처음 설치 시)
const DEFAULT_TAGS = [
  { id: "deep-work", label: "Deep Work", color: "#f97316" },
  { id: "study", label: "공부", color: "#22c55e" },
  { id: "work", label: "업무", color: "#3b82f6" },
];

const DEFAULT_SETTINGS = {
  // showMilliseconds 제거
  dailyGoalHours: 3,
  masterGoalName: "",
  masterGoalHours: 10000,
  masterGoalTagIds: [], // string[]
};

function loadInitial() {
  let tags = DEFAULT_TAGS;
  let settings = DEFAULT_SETTINGS;

  try {
    const rawTags = localStorage.getItem(TAGS_KEY);
    if (rawTags) {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) {
        tags = parsed;
      }
    }
  } catch (e) {
    console.error("태그 로드 오류:", e);
  }

  try {
    const rawSettings = localStorage.getItem(SETTINGS_KEY);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed && typeof parsed === "object") {
        // 예전에 저장된 showMilliseconds 같은 필드가 있더라도 그냥 무시되고,
        // 우리가 정의한 DEFAULT_SETTINGS 필드만 merge됨
        settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    console.error("설정 로드 오류:", e);
  }

  return { tags, settings };
}

export function SettingsProvider({ children }) {
  const initial = loadInitial();

  const [tags, setTags] = useState(initial.tags);

  const [dailyGoalHours, setDailyGoalHours] = useState(
    initial.settings.dailyGoalHours
  );
  const [masterGoalName, setMasterGoalName] = useState(
    initial.settings.masterGoalName
  );
  const [masterGoalHours, setMasterGoalHours] = useState(
    initial.settings.masterGoalHours
  );
  const [masterGoalTagIds, setMasterGoalTagIds] = useState(
    (initial.settings.masterGoalTagIds || []).map(String)
  );

  // 태그가 바뀌면 TAGS_KEY에 저장
  useEffect(() => {
    try {
      localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    } catch (e) {
      console.error("태그 저장 오류:", e);
    }
  }, [tags]);

  // 설정이 바뀌면 SETTINGS_KEY에 저장
  useEffect(() => {
    try {
      const data = {
        dailyGoalHours,
        masterGoalName,
        masterGoalHours,
        masterGoalTagIds,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("설정 저장 오류:", e);
    }
  }, [dailyGoalHours, masterGoalName, masterGoalHours, masterGoalTagIds]);

  // Mastery Goal 태그 토글
  const toggleMasterGoalTag = (tagId) => {
    const idStr = String(tagId);
    setMasterGoalTagIds((prev) => {
      const set = new Set(prev.map(String));
      if (set.has(idStr)) {
        set.delete(idStr);
      } else {
        set.add(idStr);
      }
      return Array.from(set);
    });
  };

  // 태그 CRUD (Tags 페이지에서 사용)
  const createTag = (label, color = "#64748b") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTags((prev) => [...prev, { id, label, color }]);
  };

  const updateTag = (id, patch) => {
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const deleteTag = (id) => {
    const idStr = String(id);
    setTags((prev) => prev.filter((t) => String(t.id) !== idStr));
    setMasterGoalTagIds((prev) =>
      prev.filter((tid) => String(tid) !== idStr)
    );
  };

  const value = {
    // 값
    tags,
    dailyGoalHours,
    masterGoalName,
    masterGoalHours,
    masterGoalTagIds,

    // 설정 관련 setter
    setDailyGoalHours,
    setMasterGoalName,
    setMasterGoalHours,
    toggleMasterGoalTag,

    // 태그 관리용 함수
    createTag,
    updateTag,
    deleteTag,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsProvider;
