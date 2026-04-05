import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { QuestWithSteps, QuestType, parseRewards, getQuestTypeDisplay } from "./types";

function App() {
  const [quests, setQuests] = useState<QuestWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<QuestWithSteps | null>(null);
  const [filter, setFilter] = useState<QuestType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load quests from backend
  useEffect(() => {
    async function loadQuests() {
      try {
        const data = await invoke<QuestWithSteps[]>("get_quests_with_steps");
        setQuests(data);
      } catch (e) {
        setError(String(e));
        console.error("Failed to load quests:", e);
      } finally {
        setLoading(false);
      }
    }
    loadQuests();
  }, []);

  const filteredQuests = quests.filter(quest => {
    const matchesType = filter === "all" || quest.q_type === filter;
    const matchesSearch = quest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quest.chapter_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const chapters = [...new Set(quests.map(q => q.chapter_name))];

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-amber-400 text-xl">加载中...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-red-400 text-xl">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Left Sidebar - Quest List */}
      <div className="w-80 bg-gray-800 flex flex-col border-r border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-amber-400">博德之门3 攻略</h1>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-700">
          <input
            type="text"
            placeholder="搜索任务..."
            className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-700">
          {(["all", "main", "side", "companion"] as const).map((type) => (
            <button
              key={type}
              className={`flex-1 py-2 text-sm ${
                filter === type
                  ? "bg-amber-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => setFilter(type)}
            >
              {type === "all" ? "全部" : getQuestTypeDisplay(type)}
            </button>
          ))}
        </div>

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto">
          {chapters.map((chapter) => (
            <div key={chapter}>
              <div className="px-4 py-2 bg-gray-750 text-sm font-semibold text-gray-400 border-b border-gray-700">
                {chapter}
              </div>
              {filteredQuests
                .filter((q) => q.chapter_name === chapter)
                .map((quest) => (
                  <div
                    key={quest.id}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-700 hover:bg-gray-700 ${
                      selectedQuest?.id === quest.id ? "bg-gray-700 border-l-2 border-l-amber-500" : ""
                    }`}
                    onClick={() => setSelectedQuest(quest)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          quest.q_type === "main"
                            ? "bg-red-900 text-red-200"
                            : quest.q_type === "side"
                            ? "bg-blue-900 text-blue-200"
                            : "bg-green-900 text-green-200"
                        }`}
                      >
                        {getQuestTypeDisplay(quest.q_type)}
                      </span>
                      <span className="font-medium">{quest.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {quest.steps.length} 步骤
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="p-3 border-t border-gray-700 bg-gray-800">
          <div className="text-xs text-gray-400 mb-1">进度</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: "0%" }}></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{quests.length} 个任务</div>
        </div>
      </div>

      {/* Main Content - Quest Detail */}
      <div className="flex-1 flex flex-col">
        {selectedQuest ? (
          <>
            {/* Quest Header */}
            <div className="p-6 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`text-sm px-3 py-1 rounded ${
                    selectedQuest.q_type === "main"
                      ? "bg-red-900 text-red-200"
                      : selectedQuest.q_type === "side"
                      ? "bg-blue-900 text-blue-200"
                      : "bg-green-900 text-green-200"
                  }`}
                >
                  {getQuestTypeDisplay(selectedQuest.q_type)}任务
                </span>
                <span className="text-sm text-gray-400">{selectedQuest.chapter_name}</span>
              </div>
              <h2 className="text-2xl font-bold text-amber-400">{selectedQuest.name}</h2>
              {selectedQuest.description && (
                <p className="text-gray-400 mt-2">{selectedQuest.description}</p>
              )}
            </div>

            {/* Steps List */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-300">任务步骤</h3>
              <div className="space-y-4">
                {selectedQuest.steps.map((step) => {
                  const rewards = parseRewards(step.rewards);
                  return (
                    <div
                      key={step.id}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {step.order}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-200">{step.description}</p>
                          {step.location && (
                            <div className="mt-2 text-sm text-gray-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {step.location}
                            </div>
                          )}
                          {rewards.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {rewards.map((reward, i) => (
                                <span key={i} className="text-xs bg-amber-900 text-amber-200 px-2 py-1 rounded">
                                  {reward}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <input type="checkbox" className="w-5 h-5 rounded bg-gray-700 border-gray-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>选择一个任务查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;