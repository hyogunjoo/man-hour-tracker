// src/pages/Tags.jsx
import { useState } from "react";
import { useSettings } from "../settings/SettingsContext";

export default function Tags() {
  const {
    tags = [],
    createTag,
    deleteTag,
    masterGoalTagIds = [],
    toggleMasterGoalTag,
  } = useSettings();

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#64748b");

  const handleAddTag = () => {
    const label = newLabel.trim();
    if (!label) return;
    if (typeof createTag !== "function") {
      console.error("createTag 함수가 설정 컨텍스트에 없습니다.");
      return;
    }
    createTag(label, newColor || "#64748b");
    setNewLabel("");
  };

  const handleDelete = (id) => {
    if (typeof deleteTag !== "function") {
      console.error("deleteTag 함수가 설정 컨텍스트에 없습니다.");
      return;
    }
    deleteTag(id);
  };

  const handleToggleMasterTag = (id) => {
    if (typeof toggleMasterGoalTag !== "function") return;
    toggleMasterGoalTag(id);
  };

  const isMasterTag = (id) =>
    (masterGoalTagIds || []).map(String).includes(String(id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-100 mb-4">Tags</h1>

      {/* 새 태그 추가 */}
      <section className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">
          새 태그 추가
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Timer에서 사용할 태그를 만들어 주세요. 예: 독서, 코딩, 운동 등
        </p>
        <div className="flex flex-wrap items-center gap-2">

          {/* 변경된 부분 — min-w-[160px] → min-w-40 */}
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="태그 이름"
            className="flex-1 min-w-40 rounded-md bg-slate-800 border border-slate-600 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-8 rounded-md border border-slate-600 bg-slate-800 cursor-pointer"
            />
            <span className="text-[11px] text-slate-400">색상</span>
          </div>
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600"
          >
            추가
          </button>
        </div>
      </section>

      {/* 태그 목록 */}
      <section className="bg-slate-900 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">
          태그 목록
        </h2>
        {tags.length === 0 ? (
          <p className="text-xs text-slate-400">
            아직 태그가 없습니다. 위에서 새 태그를 추가해 주세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-2 rounded-md bg-slate-800/70 border border-slate-700 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-slate-600"
                    style={{ backgroundColor: tag.color || "#64748b" }}
                  />
                  <div>
                    <div className="text-xs text-slate-100">{tag.label}</div>
                    <div className="text-[11px] text-slate-500">
                      id: {String(tag.id)}
                      {isMasterTag(tag.id) && (
                        <span className="ml-2 text-[11px] text-amber-300">
                          Mastery Goal에 포함
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleMasterTag(tag.id)}
                    className={
                      "px-2 py-1 rounded-full text-[11px] border " +
                      (isMasterTag(tag.id)
                        ? "bg-amber-500/20 text-amber-200 border-amber-400"
                        : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700")
                    }
                  >
                    {isMasterTag(tag.id) ? "Mastery 포함 해제" : "Mastery 포함"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    className="px-2 py-1 rounded-full text-[11px] border border-red-500/60 text-red-200 hover:bg-red-500/10"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
