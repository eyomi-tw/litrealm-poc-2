'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import BottomSheet from '@/components/shared/BottomSheet';
import { sendChatMessage, ChatResponse, QuickAction, compileStory, getSessionHistory } from '@/lib/api';

function GameplayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [gameState, setGameState] = useState<ChatResponse['state'] | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRoll, setLastRoll] = useState<{ dice: string; result: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const hasInitialized = useRef(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Get session ID from URL params
  useEffect(() => {
    const sessionFromUrl = searchParams.get('session');
    if (sessionFromUrl) {
      setSessionId(sessionFromUrl);
    }
  }, [searchParams]);

  // Auto-scroll user message to top when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      // After assistant responds, scroll to the user message (2nd to last)
      userMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [messages]);

  // Handle sending messages - wrapped in useCallback to prevent recreation
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() && !message) return;
    if (isLoading || isLoadingHistory) return; // Prevent multiple simultaneous requests

    setIsLoading(true);
    const userMessage = message || userInput;

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setUserInput('');

    try {
      const response = await sendChatMessage(userMessage, sessionId || undefined);

      // Save session ID for future requests
      if (!sessionId) {
        setSessionId(response.session_id);
      }

      // Add assistant response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);

      // Update quick actions and game state
      setQuickActions(response.quick_actions || []);
      setGameState(response.state);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Error connecting to the story engine. Please check that the backend is running.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userInput, isLoading, isLoadingHistory]);

  // Load chat history when we have a session
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId || hasInitialized.current) return;

      hasInitialized.current = true;
      setIsLoadingHistory(true);

      try {
        const history = await getSessionHistory(sessionId);

        // Set messages from history
        setMessages(history.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })));

        // Set game state
        setGameState(history.state);

        // If no history exists, start the adventure
        if (history.messages.length === 0) {
          handleSendMessage('Start my adventure!');
        }
      } catch (error) {
        console.error('Error loading history:', error);
        // If history load fails, start fresh (only if no messages yet)
        if (messages.length === 0) {
          handleSendMessage('Start my adventure!');
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [sessionId, handleSendMessage, messages.length]);

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.message);
  };

  const handleDiceRoll = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    setLastRoll({ dice: `d${sides}`, result });

    // Optionally send to backend
    handleSendMessage(`Roll d${sides}: ${result}`);
  };

  const handleExportStory = async () => {
    if (!sessionId) return;

    setIsExporting(true);
    try {
      await compileStory(sessionId);
      // Navigate to authoring page with the session ID
      router.push(`/authoring?session=${sessionId}`);
    } catch (error) {
      console.error('Error exporting story:', error);
      alert('Failed to export story. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderCharacterStats = () => {
    if (!gameState?.character_stats) return null;

    const stats = gameState.character_stats;
    const level = gameState.level || 1;
    const xp = gameState.xp || 0;
    const xpNext = gameState.xp_to_next_level || 100;

    const hpPercent = stats.hp && stats.max_hp ? (stats.hp / stats.max_hp) * 100 : 100;
    const manaPercent = stats.mana && stats.max_mana ? (stats.mana / stats.max_mana) * 100 : 100;
    const xpPercent = (xp / xpNext) * 100;

    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <h3 className="font-semibold mb-3">Character Stats</h3>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Level {level}</span>
              <span className="text-neutral-600">XP: {xp}/{xpNext}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${xpPercent}%` }}
              ></div>
            </div>
          </div>

          {stats.hp !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>HP</span>
                <span className="text-neutral-600">{stats.hp}/{stats.max_hp}</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${hpPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {stats.mana !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Mana</span>
                <span className="text-neutral-600">{stats.mana}/{stats.max_mana}</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${manaPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {(stats.strength !== undefined) && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-neutral-200">
              <div>STR: {stats.strength}</div>
              <div>INT: {stats.intelligence}</div>
              <div>DEX: {stats.dexterity}</div>
              <div>CON: {stats.constitution}</div>
              <div>CHA: {stats.charisma}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDiceRoller = () => {
    const diceOptions = [4, 6, 8, 10, 12, 20, 100];

    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <h3 className="font-semibold mb-3">Dice Roller</h3>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {diceOptions.map(sides => (
            <button
              key={sides}
              onClick={() => handleDiceRoll(sides)}
              className="px-2 py-2 text-sm border border-neutral-300 rounded hover:bg-neutral-50 transition"
            >
              d{sides}
            </button>
          ))}
          <button
            className="px-2 py-2 text-sm border border-neutral-300 rounded hover:bg-neutral-50 transition"
          >
            Custom
          </button>
        </div>

        {lastRoll && (
          <div className="text-center p-3 bg-neutral-50 rounded border border-neutral-200">
            <div className="text-2xl font-bold">{lastRoll.result}</div>
            <div className="text-sm text-neutral-600">Last roll: 1{lastRoll.dice}</div>
          </div>
        )}
      </div>
    );
  };

  // Show error if no session
  if (!sessionId && messages.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header currentPage="gameplay" showAuth={true} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">No Active Session</h2>
            <p className="text-neutral-600 mb-6">
              Please complete the onboarding wizard first to start your adventure.
            </p>
            <a
              href="/onboarding/step/1"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 transition"
            >
              Start Onboarding
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-50 flex flex-col">
      <Header currentPage="gameplay" showAuth={true} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block lg:w-64 bg-white border-r border-neutral-200 p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-neutral-500 mb-2">Active Campaign</h2>
            <div className="font-semibold mb-1">🏰 {gameState?.world_template || 'The Lost Kingdom'}</div>
            <div className="text-sm text-neutral-600">
              Session 12 - The Ancient Temple
            </div>
            <div className="text-xs text-neutral-500 mt-1">4/6 players online</div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-500 mb-2">Party Members</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-neutral-200"></div>
                <div className="text-sm">
                  <div className="font-medium">{gameState?.character_class || gameState?.character_name} (Wizard)</div>
                  <div className="text-xs text-green-600">● Online</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-500 mb-3">Export Story</h3>
            <button
              onClick={handleExportStory}
              disabled={isExporting || !sessionId}
              className="w-full px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-red-700 text-white hover:bg-red-800 rounded-lg font-medium transition"
            >
              {isExporting ? '⏳ Exporting...' : '📖 Export Story'}
            </button>
            <p className="text-xs text-neutral-500 mt-2">
              Compile your adventure into a publishable story
            </p>
          </div>
        </aside>

        {/* Center Content Area */}
        <section className="flex-1 flex flex-col bg-neutral-50 relative">
          {/* Story Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-44 lg:pb-28">
            <div className="max-w-4xl mx-auto">
              {/* Chapter Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Chapter 1: The Whispering Shadows</h1>
                <p className="text-neutral-600">Location: Ancient Temple Entrance • Time: Dusk</p>
              </div>

              {/* Messages */}
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    ref={msg.role === 'user' && idx === messages.length - 2 ? userMessageRef : null}
                  >
                    {msg.role === 'user' ? (
                      <div className="flex justify-end pr-1">
                        <div className="bg-black text-white rounded-lg px-4 py-2 max-w-md">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-neutral-200 p-4 md:p-6">
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="bg-white rounded-lg border border-neutral-200 p-6">
                    <div className="flex items-center space-x-2 text-neutral-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600"></div>
                      <span>The story weaves...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Buttons */}
              {quickActions.length > 0 && !isLoading && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3">What would you like to do next?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickAction(action)}
                        className="text-left p-4 border border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-white transition"
                      >
                        <div className="font-medium">{action.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons - Fixed above input (mobile only) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white z-10">
            <div className="flex gap-2 p-2 border-b border-neutral-200">
              <button
                onClick={() => setIsStatsOpen(true)}
                className="flex-1 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition text-sm font-medium"
              >
                📊 Stats
              </button>
              <button
                onClick={handleExportStory}
                disabled={isExporting || !sessionId}
                className="flex-1 px-4 py-2 bg-red-700 text-white hover:bg-red-800 rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? '⏳ Export' : '📖 Export'}
              </button>
            </div>
            <div className="p-3 flex space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(userInput);
                  }
                }}
                placeholder="Describe your action..."
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage(userInput)}
                disabled={isLoading || !userInput.trim()}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition"
              >
                ✉️
              </button>
            </div>
          </div>

          {/* Input Area - Fixed to bottom (desktop only) */}
          <div className="hidden lg:block fixed bottom-0 left-64 right-80 border-t border-neutral-200 bg-white p-4 shadow-lg z-10">
            <div className="max-w-4xl mx-auto flex space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(userInput);
                  }
                }}
                placeholder="Describe your action or continue the story..."
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage(userInput)}
                disabled={isLoading || !userInput.trim()}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition"
              >
                ✉️ Send
              </button>
            </div>
          </div>
        </section>

        {/* Right Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block lg:w-80 bg-white border-l border-neutral-200 p-4 overflow-y-auto">
          {renderCharacterStats()}
        </aside>
      </main>

      {/* Mobile Bottom Sheet for Character Stats */}
      <BottomSheet
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        title="Character Stats"
      >
        <div className="py-4">
          {renderCharacterStats()}
        </div>
      </BottomSheet>
    </div>
  );
}

export default function GameplayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameplayContent />
    </Suspense>
  );
}
