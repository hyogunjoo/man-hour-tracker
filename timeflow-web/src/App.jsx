// src/App.jsx
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import TimerPage from "./pages/Timer";
import Report from "./pages/Report";
import Tags from "./pages/Tags";
import Settings from "./pages/Settings";

// 여기 두 줄을 default import로 수정
import TimerProvider from "./timer/TimerProvider";
import SettingsProvider from "./settings/SettingsProvider";


function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <TimerProvider>
          <div className="min-h-screen bg-slate-950 text-slate-50">
            {/* 상단 헤더 + 네비게이션 */}
            <header className="border-b border-slate-800">
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-semibold tracking-tight">
                  TimeFlow
                </div>
                <nav className="flex items-center gap-4 text-sm">
                  {/* Home 제거, Timer를 메인 진입으로 사용 */}
                  <NavLink
                    to="/timer"
                    className={({ isActive }) =>
                      `px-2 py-1 rounded ${
                        isActive ? "text-emerald-400" : "text-slate-300"
                      }`
                    }
                  >
                    Timer
                  </NavLink>
                  <NavLink
                    to="/report"
                    className={({ isActive }) =>
                      `px-2 py-1 rounded ${
                        isActive ? "text-emerald-400" : "text-slate-300"
                      }`
                    }
                  >
                    Report
                  </NavLink>
                  <NavLink
                    to="/tags"
                    className={({ isActive }) =>
                      `px-2 py-1 rounded ${
                        isActive ? "text-emerald-400" : "text-slate-300"
                      }`
                    }
                  >
                    Tags
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `px-2 py-1 rounded ${
                        isActive ? "text-emerald-400" : "text-slate-300"
                      }`
                    }
                  >
                    Settings
                  </NavLink>
                </nav>
              </div>
            </header>

            {/* 메인 컨텐츠 */}
            <main className="max-w-6xl mx-auto px-4 py-6">
              <Routes>
                {/* 기본 진입을 Timer로 */}
                <Route path="/" element={<TimerPage />} />
                <Route path="/timer" element={<TimerPage />} />
                <Route path="/report" element={<Report />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </TimerProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
