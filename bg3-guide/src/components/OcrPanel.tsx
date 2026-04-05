import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { QuestWithSteps } from '../types';
import { recognizeText, matchQuest, QuestMatch } from '../utils/ocr';

interface OcrPanelProps {
  quests: QuestWithSteps[];
  onSelectQuest: (quest: QuestWithSteps) => void;
  onClose: () => void;
}

export default function OcrPanel({ quests, onSelectQuest, onClose }: OcrPanelProps) {
  const [image, setImage] = useState<string | Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState<string>('');
  const [matches, setMatches] = useState<QuestMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<QuestMatch | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Handle image paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          setImage(blob);
          setImagePreview(URL.createObjectURL(blob));
          setError(null);
          setOcrText('');
          setMatches([]);
        }
      }
    }
  }, []);

  // Setup paste listener
  useState(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  });

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
      setOcrText('');
      setMatches([]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
      setOcrText('');
      setMatches([]);
    }
  };

  // Capture screen using Tauri command
  const handleCaptureScreen = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await invoke<{ image_base64: string; width: number; height: number }>('capture_screen');
      const base64Data = `data:image/png;base64,${result.image_base64}`;
      setImage(base64Data);
      setImagePreview(base64Data);
      setOcrText('');
      setMatches([]);
    } catch (e) {
      setError(`截图失败: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture BG3 window
  const handleCaptureGame = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await invoke<{ image_base64: string; width: number; height: number }>(
        'capture_window',
        { windowName: "Baldur's Gate" }
      );
      const base64Data = `data:image/png;base64,${result.image_base64}`;
      setImage(base64Data);
      setImagePreview(base64Data);
      setOcrText('');
      setMatches([]);
    } catch (e) {
      setError(`游戏窗口未找到或截图失败: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run OCR recognition
  const handleRecognize = async () => {
    if (!image) return;

    setIsProcessing(true);
    setOcrProgress(0);
    setError(null);

    try {
      const result = await recognizeText(image, setOcrProgress);
      setOcrText(result.text);

      // Match quests
      if (result.text.length > 0) {
        const questMatches = matchQuest(result.text, quests);
        setMatches(questMatches);
        if (questMatches.length > 0) {
          setSelectedMatch(questMatches[0]);
        }
      }
    } catch (e) {
      setError(`OCR识别失败: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Jump to selected quest
  const handleJumpToQuest = () => {
    if (selectedMatch) {
      onSelectQuest(selectedMatch.quest);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-amber-400">截图识别任务</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Image drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-amber-500 transition-colors cursor-pointer bg-gray-700/50"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Screenshot preview"
                className="max-h-48 mx-auto rounded"
              />
            ) : (
              <div className="py-8">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 mb-2">粘贴截图或拖拽图片到此处</p>
                <p className="text-sm text-gray-500">支持 Ctrl+V 粘贴</p>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          {/* Capture buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCaptureScreen}
              disabled={isProcessing}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              截取屏幕
            </button>
            <button
              onClick={handleCaptureGame}
              disabled={isProcessing}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              截取游戏窗口
            </button>
            <button
              onClick={handleRecognize}
              disabled={!image || isProcessing}
              className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && ocrProgress > 0 ? (
                <span>识别中 {ocrProgress}%</span>
              ) : (
                <span>
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  开始识别
                </span>
              )}
            </button>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* OCR Result */}
          {ocrText && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">识别结果:</h3>
              <div className="bg-gray-700 rounded-lg p-3 text-gray-200 text-sm max-h-32 overflow-y-auto">
                {ocrText}
              </div>
            </div>
          )}

          {/* Match results */}
          {matches.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">匹配任务:</h3>
              <div className="space-y-2">
                {matches.map((match, index) => (
                  <div
                    key={match.quest.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMatch?.quest.id === match.quest.id
                        ? 'bg-amber-900/50 border border-amber-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className="flex-shrink-0 text-sm font-medium text-gray-400">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-200">{match.quest.name}</span>
                        <span className="text-xs text-gray-500">{match.quest.chapter_name}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        匹配: "{match.matchedText}"
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-sm font-bold ${
                        match.score >= 80 ? 'text-green-400' :
                        match.score >= 60 ? 'text-amber-400' :
                        'text-gray-400'
                      }`}>
                        {match.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jump button */}
          {selectedMatch && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleJumpToQuest}
                className="py-2 px-6 bg-amber-600 hover:bg-amber-500 rounded-lg font-medium transition-colors"
              >
                跳转到任务详情
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}