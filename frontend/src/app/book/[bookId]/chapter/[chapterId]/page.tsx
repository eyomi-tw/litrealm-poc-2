'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import BottomSheet from '@/components/shared/BottomSheet';
import { sendChatMessage, ChatResponse, QuickAction, getChapter, compileChapter, compileChapterDmNarrative, updateChapter, completeChapter, deleteChapter, validateContent, ContentValidationResponse, getBook } from '@/lib/api';
import { Chapter } from '@/lib/types/game';

interface PageProps {
  params: Promise<{ bookId: string; chapterId: string }>;
}

export default function ChapterPage({ params }: PageProps) {
  const { bookId, chapterId } = use(params);
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'authoring'>('game');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [gameState, setGameState] = useState<ChatResponse['state'] | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRoll, setLastRoll] = useState<{ dice: string; result: number } | null>(null);
  const [authoredContent, setAuthoredContent] = useState('');
  const [isCompilingFull, setIsCompilingFull] = useState(false);
  const [isCompilingDm, setIsCompilingDm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [createNextChapter, setCreateNextChapter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<HTMLDivElement>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const hasInitialized = useRef(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ContentValidationResponse | null>(null);
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  // Load chapter data
  useEffect(() => {
    const loadChapter = async () => {
      if (!chapterId || hasInitialized.current) return;

      hasInitialized.current = true;

      try {
        const chapterData = await getChapter(chapterId);
        setChapter(chapterData);

        // Load transcript as messages
        setMessages(chapterData.game_transcript.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })));

        // Extract quick_actions from the last assistant message (if available)
        const lastAssistantMessage = [...chapterData.game_transcript]
          .reverse()
          .find((msg: any) => msg.role === 'assistant');
        if (lastAssistantMessage?.quick_actions) {
          setQuickActions(lastAssistantMessage.quick_actions);
        }

        // Load state
        setGameState(chapterData.final_state);

        // Load authored content
        setAuthoredContent(chapterData.authored_content || '');
        setOriginalContent(chapterData.authored_content || '');
        setHasUnsavedChanges(false);

        // If no messages, send initial message to start the chapter
        if (chapterData.game_transcript.length === 0) {
          console.log('Auto-starting chapter with session:', chapterData.session_id);
          setIsLoading(true);

          // Add user message immediately
          setMessages([{ role: 'user', content: 'Begin the adventure!' }]);

          try {
            const response = await sendChatMessage('Begin the adventure!', chapterData.session_id);

            // Add assistant response
            setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
            setQuickActions(response.quick_actions || []);
            setGameState(response.state);
          } catch (error) {
            console.error('Error auto-starting chapter:', error);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '⚠️ Error connecting to the story engine. Please check that the backend is running.'
            }]);
          } finally {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error loading chapter:', error);
      }
    };

    loadChapter();
  }, [chapterId]);

  // Track unsaved changes
  useEffect(() => {
    if (originalContent !== null && authoredContent !== originalContent) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [authoredContent, originalContent]);

  // Warn before leaving page with unsaved changes (external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Warn before internal navigation with unsaved changes
  useEffect(() => {
    if (activeTab !== 'authoring' || !hasUnsavedChanges) return;

    const handleNavigation = async (targetUrl: string) => {
      const confirmLeave = window.confirm(
        'You have unsaved changes to your authored content. Do you want to save before leaving?'
      );

      if (confirmLeave) {
        // Save the changes
        if (chapter && !isSaving) {
          try {
            await updateChapter(chapter.id, {
              authored_content: authoredContent
            });
            router.push(targetUrl);
          } catch (error) {
            console.error('Error saving chapter:', error);
            const continueWithoutSaving = window.confirm(
              'Failed to save. Leave without saving?'
            );
            if (continueWithoutSaving) {
              router.push(targetUrl);
            }
          }
        } else {
          router.push(targetUrl);
        }
      } else {
        const continueAnyway = window.confirm(
          'Leave without saving? Your unsaved changes will be lost.'
        );

        if (continueAnyway) {
          router.push(targetUrl);
        }
      }
    };

    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        const currentUrl = window.location.pathname;
        const linkUrl = new URL(link.href).pathname;

        // If navigating away from current chapter
        if (linkUrl !== currentUrl) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          handleNavigation(linkUrl);
        }
      }
    };

    // Capture phase to intercept before Next.js router
    document.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [hasUnsavedChanges, activeTab, chapter, isSaving, authoredContent, router]);

  // Auto-scroll user message to top when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      userMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() && !message) return;
    if (isLoading || !chapter) return;

    setIsLoading(true);
    const userMessage = message || userInput;

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setUserInput('');

    try {
      // Use the chapter's session_id
      const response = await sendChatMessage(userMessage, chapter.session_id);

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
  }, [chapter, userInput, isLoading]);

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.message || action.label);
  };

  const rollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    setLastRoll({ dice: `d${sides}`, result });
    handleSendMessage(`🎲 Rolling d${sides}... I got a ${result}!`);
  };

  const handleCompileChapter = async () => {
    if (!chapter || isCompilingFull) return;

    setIsCompilingFull(true);
    try {
      const result = await compileChapter(chapter.id);
      setAuthoredContent(result.narrative);
      setSaveMessage(`✨ Chapter compiled successfully! ${result.word_count} words generated.`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error compiling chapter:', error);
      setSaveMessage('❌ Failed to compile chapter. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsCompilingFull(false);
    }
  };

  const handleCompileDmNarrative = async () => {
    if (!chapter || isCompilingDm) return;

    setIsCompilingDm(true);
    try {
      const result = await compileChapterDmNarrative(chapter.id);
      setAuthoredContent(result.narrative);
      setSaveMessage(`✨ DM Narrative compiled! ${result.word_count} words generated with stat changes only.`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error compiling DM narrative:', error);
      setSaveMessage('❌ Failed to compile DM narrative. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsCompilingDm(false);
    }
  };

  const handleSaveChapter = async () => {
    if (!chapter || isSaving) return;

    setIsSaving(true);
    try {
      await updateChapter(chapter.id, {
        authored_content: authoredContent
      });

      setOriginalContent(authoredContent);
      setHasUnsavedChanges(false);
      setSaveMessage('💾 Draft saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving chapter:', error);
      setSaveMessage('❌ Failed to save. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateContent = async () => {
    if (!chapter || !authoredContent.trim() || isValidating) return;

    setIsValidating(true);
    setValidationResult(null);
    setShowValidationResults(false);

    try {
      // Fetch book to get game configuration
      const book = await getBook(bookId);

      // Build validation request
      const validationRequest = {
        content: authoredContent,
        content_type: 'chapter' as const,
        mode: book.game_config.mode,
        tone: book.game_config.tone,
        world_template: book.game_config.world.template,
        world_name: book.game_config.world.name,
        magic_system: book.game_config.world.magicSystem,
        world_tone: book.game_config.world.worldTone,
        character_name: book.game_config.character.name,
        character_class: book.game_config.character.class,
        background: book.game_config.character.background,
        alignment: book.game_config.character.alignment,
        character_role: book.game_config.character.role,
        quest_template: book.game_config.story.questType,
      };

      const result = await validateContent(validationRequest);
      setValidationResult(result);
      setShowValidationResults(true);

      setSaveMessage(`✅ Validation complete! Overall score: ${result.overall_score}/100`);
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Error validating content:', error);
      setSaveMessage('❌ Failed to validate content. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'in_progress' | 'complete' | 'published') => {
    if (!chapter) return;

    try {
      const updatedChapter = await updateChapter(chapter.id, { status: newStatus });
      setChapter(updatedChapter);
      setSaveMessage(`✓ Status updated to ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      setSaveMessage('❌ Failed to update status.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleCompleteChapter = async () => {
    if (!chapter || isCompleting) return;

    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmComplete = window.confirm(
        'You have unsaved changes to your authored content. Do you want to save before completing the chapter?'
      );

      if (confirmComplete) {
        // Save first, then complete
        await handleSaveChapter();
      } else {
        // User chose not to save, ask if they want to continue anyway
        const continueAnyway = window.confirm(
          'Continue without saving? Your unsaved changes will be lost.'
        );

        if (!continueAnyway) {
          return; // User cancelled
        }
      }
    }

    setIsCompleting(true);
    try {
      const result = await completeChapter(chapter.id, createNextChapter);

      // Update current chapter
      setChapter(result.chapter);

      // Show success message
      if (result.next_chapter_created && result.next_chapter) {
        setSaveMessage(`✅ Chapter completed! Next chapter created.`);
        setTimeout(() => {
          // Navigate to the new chapter
          router.push(`/book/${bookId}/chapter/${result.next_chapter.id}`);
        }, 2000);
      } else {
        setSaveMessage(`✅ Chapter marked as complete!`);
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error completing chapter:', error);
      setSaveMessage('❌ Failed to complete chapter. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!chapter || isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteChapter(chapter.id);

      // Navigate back to book overview after successful deletion
      setSaveMessage('Chapter deleted successfully');
      setTimeout(() => {
        router.push(`/book/${bookId}`);
      }, 1000);
    } catch (error) {
      console.error('Error deleting chapter:', error);
      setSaveMessage('❌ Failed to delete chapter. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!chapter) {
    return (
      <>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Inter:wght@400;600&display=swap');

          :root {
            --tw-flamingo-pink: #F2617A;
            --tw-wave-blue: #47A1AD;
            --tw-sapphire-blue: #003D4F;
            --tw-mist-gray: #EDF1F3;
          }

          body {
            font-family: 'Inter', sans-serif;
          }

          .headline {
            font-family: 'Bitter', serif;
          }
        `}</style>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)' }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-4" style={{ borderColor: 'var(--tw-sapphire-blue)' }}></div>
            <p className="text-gray-700">Loading chapter...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Inter:wght@400;600&display=swap');

        :root {
          --tw-flamingo-pink: #F2617A;
          --tw-wave-blue: #47A1AD;
          --tw-sapphire-blue: #003D4F;
          --tw-mist-gray: #EDF1F3;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .headline {
          font-family: 'Bitter', serif;
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)' }}>
        {/* Header */}
        <Header />

        {/* Navigation Bar with Breadcrumbs and Chapter Navigation */}
        <div className="bg-white/90 backdrop-blur-sm border-b px-4 py-3" style={{ borderColor: 'var(--tw-mist-gray)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => router.push(`/book/${bookId}`)}
                className="transition-colors headline"
                style={{ color: 'var(--tw-sapphire-blue)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--tw-flamingo-pink)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--tw-sapphire-blue)'}
              >
                Book Overview
              </button>
              <span>/</span>
              <span className="font-medium headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Chapter {chapter.number}</span>
            </nav>

            {/* Navigation and Actions */}
            <div className="flex items-center gap-2">
              {/* Delete Button */}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: 'var(--tw-flamingo-pink)' }}
                title="Delete chapter"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Previous/Next Navigation */}
              <button
                onClick={() => chapter.previous_chapter_id && router.push(`/book/${bookId}/chapter/${chapter.previous_chapter_id}`)}
                disabled={!chapter.previous_chapter_id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  chapter.previous_chapter_id
                    ? 'border-2 hover:shadow-md'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={chapter.previous_chapter_id ? {
                  borderColor: 'var(--tw-wave-blue)',
                  color: 'var(--tw-sapphire-blue)'
                } : {
                  borderColor: '#d1d5db',
                  color: '#9ca3af'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <button
                onClick={() => chapter.next_chapter_id && router.push(`/book/${bookId}/chapter/${chapter.next_chapter_id}`)}
                disabled={!chapter.next_chapter_id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  chapter.next_chapter_id
                    ? 'border-2 hover:shadow-md'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={chapter.next_chapter_id ? {
                  borderColor: 'var(--tw-wave-blue)',
                  color: 'var(--tw-sapphire-blue)'
                } : {
                  borderColor: '#d1d5db',
                  color: '#9ca3af'
                }}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Three-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Character Stats */}
          <aside className="w-64 bg-white/50 backdrop-blur-sm border-r overflow-y-auto p-4" style={{ borderColor: 'var(--tw-mist-gray)' }}>
            <h2 className="text-lg font-bold mb-4 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Character Stats</h2>

            {gameState && (
              <div className="space-y-4">
                {/* Level & XP */}
                {gameState.level !== undefined && (
                  <div className="p-3 rounded-lg border-2" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)', borderColor: 'var(--tw-flamingo-pink)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>Level</span>
                      <span className="text-2xl font-bold headline" style={{ color: 'var(--tw-flamingo-pink)' }}>{gameState.level}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {gameState.xp}/{gameState.xp_to_next_level} XP
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tw-mist-gray)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          background: 'linear-gradient(to right, var(--tw-wave-blue), var(--tw-flamingo-pink))',
                          width: `${((gameState.xp || 0) / (gameState.xp_to_next_level || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Health & Mana */}
                {gameState.character_stats && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>HP</span>
                        <span className="text-gray-700">{gameState.character_stats.hp}/{gameState.character_stats.max_hp}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tw-mist-gray)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: 'var(--tw-flamingo-pink)',
                            width: `${((gameState.character_stats.hp || 0) / (gameState.character_stats.max_hp || 1)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {gameState.character_stats.mana !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>Mana</span>
                          <span className="text-gray-700">{gameState.character_stats.mana}/{gameState.character_stats.max_mana}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tw-mist-gray)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              backgroundColor: 'var(--tw-wave-blue)',
                              width: `${((gameState.character_stats.mana || 0) / (gameState.character_stats.max_mana || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attributes */}
                {gameState.character_stats && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tw-sapphire-blue)' }}>Attributes</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Strength</span>
                        <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.strength}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Intelligence</span>
                        <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.intelligence}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Dexterity</span>
                        <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.dexterity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Constitution</span>
                        <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.constitution}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Charisma</span>
                        <span className="font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.charisma}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory */}
                {gameState.inventory && gameState.inventory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tw-sapphire-blue)' }}>Inventory</h3>
                    <ul className="space-y-1">
                      {gameState.inventory.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-center">
                          <span className="mr-2" style={{ color: 'var(--tw-flamingo-pink)' }}>•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar */}
            <div className="flex border-b bg-white/50 backdrop-blur-sm" style={{ borderColor: 'var(--tw-mist-gray)' }}>
              <button
                onClick={() => setActiveTab('game')}
                className={`px-6 py-3 text-sm font-medium transition-all ${
                  activeTab === 'game'
                    ? 'border-b-2'
                    : ''
                }`}
                style={activeTab === 'game' ? {
                  borderColor: 'var(--tw-flamingo-pink)',
                  color: 'var(--tw-sapphire-blue)'
                } : {
                  color: '#6b7280'
                }}
              >
                🎮 Game
              </button>
              <button
                onClick={() => setActiveTab('authoring')}
                className={`px-6 py-3 text-sm font-medium transition-all ${
                  activeTab === 'authoring'
                    ? 'border-b-2'
                    : ''
                }`}
                style={activeTab === 'authoring' ? {
                  borderColor: 'var(--tw-flamingo-pink)',
                  color: 'var(--tw-sapphire-blue)'
                } : {
                  color: '#6b7280'
                }}
              >
                ✍️ Authoring
              </button>
            </div>

            {/* Game Tab Content */}
            {activeTab === 'game' && (
            <div className="flex-1 overflow-y-auto px-4 pb-48">
          {/* Chapter Title */}
          <div className="py-6 border-b" style={{ borderColor: 'var(--tw-mist-gray)' }}>
            <h1 className="text-2xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
              {chapter.title}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Chapter {chapter.number} • {chapter.status}
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 py-6 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} ref={msg.role === 'user' ? userMessageRef : null}>
                <div className={`flex items-start space-x-3 ${
                  msg.role === 'user' ? 'justify-end' : ''
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}>
                      DM
                    </div>
                  )}
                  <div className={`flex-1 ${
                    msg.role === 'user' ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block max-w-2xl px-4 py-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'text-white border-2'
                        : 'bg-white/80 backdrop-blur-sm border-2'
                    }`}
                    style={msg.role === 'user' ? {
                      background: 'linear-gradient(to right, var(--tw-flamingo-pink), var(--tw-wave-blue))',
                      borderColor: 'var(--tw-flamingo-pink)'
                    } : {
                      borderColor: 'var(--tw-mist-gray)'
                    }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={msg.role === 'assistant' ? { color: 'var(--tw-sapphire-blue)' } : {}}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ backgroundColor: 'var(--tw-mist-gray)', color: 'var(--tw-sapphire-blue)' }}>
                      {gameState?.character_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ background: 'linear-gradient(to bottom right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}>
                  DM
                </div>
                <div className="bg-white/80 backdrop-blur-sm border-2 px-4 py-3 rounded-lg" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tw-wave-blue)', animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tw-flamingo-pink)', animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tw-wave-blue)', animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="pb-4">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white/80 backdrop-blur-sm border-2 rounded-lg text-sm hover:shadow-md transition-all disabled:opacity-50"
                    style={{
                      borderColor: 'var(--tw-wave-blue)',
                      color: 'var(--tw-sapphire-blue)'
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t p-4" style={{ borderColor: 'var(--tw-mist-gray)' }}>
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage(userInput)}
                  placeholder="What do you do next?"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50"
                  style={{
                    borderColor: 'var(--tw-mist-gray)',
                    backgroundColor: 'white'
                  }}
                />
                <button
                  onClick={() => handleSendMessage(userInput)}
                  disabled={isLoading || !userInput.trim()}
                  className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(to right, var(--tw-flamingo-pink), var(--tw-wave-blue))' }}
                >
                  Send
                </button>
              </div>

              {/* Dice Roller */}
              <div className="flex space-x-2 mt-3">
                <span className="text-sm text-gray-600 py-2">Quick Roll:</span>
                {[4, 6, 8, 10, 12, 20].map((sides) => (
                  <button
                    key={sides}
                    onClick={() => rollDice(sides)}
                    disabled={isLoading}
                    className="px-3 py-1.5 border-2 rounded text-xs hover:shadow-md transition-all disabled:opacity-50"
                    style={{
                      borderColor: 'var(--tw-wave-blue)',
                      color: 'var(--tw-sapphire-blue)',
                      backgroundColor: 'white'
                    }}
                  >
                    d{sides}
                  </button>
                ))}
                {lastRoll && (
                  <span className="text-sm py-2 ml-2" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    Last: {lastRoll.dice} = {lastRoll.result}
                  </span>
                )}
              </div>
            </div>
          </div>
            </div>
            )}

            {/* Authoring Tab Content */}
            {activeTab === 'authoring' && (
              <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Chapter Info */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <h1 className="text-2xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
                      {chapter.title}
                    </h1>
                    {/* Status Dropdown */}
                    <select
                      value={chapter.status}
                      onChange={(e) => handleStatusChange(e.target.value as 'draft' | 'in_progress' | 'complete' | 'published')}
                      className="px-3 py-1 text-sm rounded-lg border-2 bg-white hover:shadow-md focus:outline-none focus:ring-2 cursor-pointer"
                      style={{
                        borderColor: 'var(--tw-wave-blue)',
                        color: 'var(--tw-sapphire-blue)'
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="in_progress">In Progress</option>
                      <option value="complete">Complete</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Chapter {chapter.number}</span>
                    <span>•</span>
                    <span>{authoredContent.split(/\s+/).filter(w => w.length > 0).length} words</span>
                  </div>
                </div>

                {/* Rich Text Editor */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border-2 p-6" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                  <div className="mb-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Chapter Content</h2>
                    <div className="flex items-center gap-3">
                      {saveMessage && (
                        <span className="text-sm text-gray-700 animate-fade-in">
                          {saveMessage}
                        </span>
                      )}
                      <button
                        className="px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        onClick={handleSaveChapter}
                        disabled={isSaving}
                        style={{ background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}
                      >
                        {isSaving ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <span>💾</span>
                            <span>Save Draft</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={authoredContent}
                    onChange={(e) => setAuthoredContent(e.target.value)}
                    className="w-full h-[600px] px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 font-serif text-base leading-relaxed resize-none"
                    placeholder="Write your refined chapter content here... This is where you transform the gameplay transcript into polished narrative prose."
                    style={{
                      borderColor: 'var(--tw-mist-gray)',
                      color: 'var(--tw-sapphire-blue)'
                    }}
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    {authoredContent.split(/\s+/).filter(w => w.length > 0).length} words
                  </div>
                </div>

                {/* Content Validation Section */}
                <div className="mt-6 p-4 rounded-lg border-2" style={{ background: 'linear-gradient(to right, rgba(242, 97, 122, 0.05), rgba(71, 161, 173, 0.05))', borderColor: 'var(--tw-flamingo-pink)' }}>
                  <h3 className="font-semibold mb-2 text-sm flex items-center gap-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    <span>🔍</span>
                    <span>Content Validation</span>
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Validate your authored content for consistency with world, character, tone, quest, and story mode. Get detailed feedback and quality scores.
                  </p>

                  <button
                    onClick={handleValidateContent}
                    disabled={isValidating || !authoredContent.trim()}
                    className="w-full px-4 py-2 text-white rounded-lg text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(to right, var(--tw-flamingo-pink), var(--tw-sapphire-blue))' }}
                  >
                    {isValidating ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Validate Content Quality</span>
                      </>
                    )}
                  </button>

                  {isValidating && (
                    <p className="text-xs text-gray-600 mt-2">
                      This may take 15-30 seconds. The AI is analyzing your content for consistency and quality...
                    </p>
                  )}

                  {/* Validation Results */}
                  {showValidationResults && validationResult && (
                    <div className="mt-4 space-y-3">
                      {/* Overall Score */}
                      <div className="p-4 rounded-lg border-2" style={{
                        background: validationResult.overall_status === 'PASS' ? 'rgba(34, 197, 94, 0.1)' : validationResult.overall_status === 'MINOR_ISSUES' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderColor: validationResult.overall_status === 'PASS' ? '#22c55e' : validationResult.overall_status === 'MINOR_ISSUES' ? '#fbbf24' : '#ef4444'
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-lg headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
                            Overall Result: {validationResult.overall_status.replace('_', ' ')}
                          </h4>
                          <span className="text-2xl font-bold" style={{
                            color: validationResult.overall_status === 'PASS' ? '#22c55e' : validationResult.overall_status === 'MINOR_ISSUES' ? '#fbbf24' : '#ef4444'
                          }}>
                            {validationResult.overall_score}/100
                          </span>
                        </div>
                      </div>

                      {/* Category Scores */}
                      <div className="space-y-2">
                        {[
                          { key: 'world_consistency', label: 'World Consistency', icon: '🌍' },
                          { key: 'character_consistency', label: 'Character Consistency', icon: '👤' },
                          { key: 'narrator_tone', label: 'Narrator Tone', icon: '🎭' },
                          { key: 'quest_alignment', label: 'Quest Alignment', icon: '🎯' },
                          { key: 'story_mode', label: 'Story Mode', icon: '📚' },
                        ].map(({ key, label, icon }) => {
                          const category = validationResult[key as keyof typeof validationResult] as any;
                          return (
                            <div key={key} className="p-3 bg-white/50 rounded border" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold" style={{ color: 'var(--tw-sapphire-blue)' }}>
                                  {icon} {label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium px-2 py-1 rounded" style={{
                                    background: category.status === 'PASS' ? 'rgba(34, 197, 94, 0.2)' : category.status === 'MINOR_ISSUES' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: category.status === 'PASS' ? '#166534' : category.status === 'MINOR_ISSUES' ? '#92400e' : '#991b1b'
                                  }}>
                                    {category.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-sm font-bold" style={{ color: 'var(--tw-sapphire-blue)' }}>
                                    {category.score}/100
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{category.feedback}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quality Notes */}
                      {validationResult.quality_notes && (
                        <div className="p-3 bg-white/50 rounded border" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                          <h5 className="text-sm font-semibold mb-1" style={{ color: 'var(--tw-sapphire-blue)' }}>💡 Quality Notes</h5>
                          <p className="text-xs text-gray-600">{validationResult.quality_notes}</p>
                        </div>
                      )}

                      {/* Suggested Improvements */}
                      {validationResult.suggested_improvements && validationResult.suggested_improvements !== 'None - content is excellent' && (
                        <div className="p-3 bg-white/50 rounded border" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                          <h5 className="text-sm font-semibold mb-1" style={{ color: 'var(--tw-sapphire-blue)' }}>✏️ Suggested Improvements</h5>
                          <p className="text-xs text-gray-600">{validationResult.suggested_improvements}</p>
                        </div>
                      )}

                      {/* Close Button */}
                      <button
                        onClick={() => setShowValidationResults(false)}
                        className="w-full px-3 py-2 text-sm rounded-lg border-2 hover:shadow-md transition-all"
                        style={{ borderColor: 'var(--tw-wave-blue)', color: 'var(--tw-sapphire-blue)' }}
                      >
                        Close Results
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Compilation Section */}
                <div className="mt-6 p-4 rounded-lg border-2" style={{ background: 'linear-gradient(to right, rgba(71, 161, 173, 0.1), rgba(242, 97, 122, 0.1))', borderColor: 'var(--tw-wave-blue)' }}>
                  <h3 className="font-semibold mb-2 text-sm flex items-center gap-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    <span>✨</span>
                    <span>AI Story Compiler</span>
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Transform your gameplay transcript into polished LitRPG prose. The AI will add creative enrichments including internal reflections, character doubts, sensory details, and dialogue - all while respecting your chosen story mode and narrator tone.
                  </p>

                  <div className="space-y-2">
                    {/* Full Compilation Button */}
                    <button
                      onClick={handleCompileChapter}
                      disabled={isCompilingFull || isCompilingDm || !chapter}
                      className="w-full px-4 py-2 text-white rounded-lg text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(to right, var(--tw-wave-blue), var(--tw-flamingo-pink))' }}
                    >
                      {isCompilingFull ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Compiling...</span>
                        </>
                      ) : (
                        <>
                          <span>✨</span>
                          <span>Generate Full Chapter (Player + DM)</span>
                        </>
                      )}
                    </button>

                    {/* DM Narrative Only Button */}
                    <button
                      onClick={handleCompileDmNarrative}
                      disabled={isCompilingFull || isCompilingDm || !chapter}
                      className="w-full px-4 py-2 text-white rounded-lg text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}
                    >
                      {isCompilingDm ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Compiling...</span>
                        </>
                      ) : (
                        <>
                          <span>📖</span>
                          <span>Generate DM Narrative + Game Mechanics</span>
                        </>
                      )}
                    </button>
                  </div>

                  {(isCompilingFull || isCompilingDm) && (
                    <p className="text-xs text-gray-600 mt-2">
                      This may take 15-30 seconds. The AI is reading your gameplay and crafting a narrative...
                    </p>
                  )}

                  <div className="mt-3 p-3 bg-white/50 rounded border text-xs text-gray-600" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                    <p className="font-semibold mb-1" style={{ color: 'var(--tw-sapphire-blue)' }}>�� Compilation Options:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>Full Chapter:</strong> Includes all player actions and DM responses with complete stat tracking</li>
                      <li><strong>DM Narrative Only:</strong> Uses only DM messages, filters out player actions, shows stats ONLY when they change (level-ups, stat increases)</li>
                    </ul>
                  </div>
                </div>

                {/* Complete Chapter Section */}
                <div className="mt-6 p-4 rounded-lg border-2" style={{ background: 'linear-gradient(to right, rgba(242, 97, 122, 0.1), rgba(71, 161, 173, 0.1))', borderColor: 'var(--tw-flamingo-pink)' }}>
                  <h3 className="font-semibold mb-2 text-sm flex items-center gap-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    <span>✓</span>
                    <span>Complete Chapter</span>
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Mark this chapter as complete and optionally create the next chapter. The next chapter will automatically start with your current character stats and progress.
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createNextChapter}
                        onChange={(e) => setCreateNextChapter(e.target.checked)}
                        className="w-4 h-4 rounded border-2 cursor-pointer"
                        style={{ borderColor: 'var(--tw-wave-blue)', accentColor: 'var(--tw-flamingo-pink)' }}
                      />
                      <span>Create next chapter</span>
                    </label>
                  </div>
                  <button
                    onClick={handleCompleteChapter}
                    disabled={isCompleting || !chapter || chapter.status === 'complete'}
                    className="px-4 py-2 text-white rounded-lg text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ background: 'linear-gradient(to right, var(--tw-flamingo-pink), var(--tw-wave-blue))' }}
                  >
                    {isCompleting ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>{createNextChapter ? 'Complete & Create Next Chapter' : 'Complete Chapter'}</span>
                      </>
                    )}
                  </button>
                  {chapter?.status === 'complete' && (
                    <p className="text-xs text-gray-600 mt-2">
                      This chapter is already complete.
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - World State */}
          <aside className="w-64 bg-white/50 backdrop-blur-sm border-l overflow-y-auto p-4" style={{ borderColor: 'var(--tw-mist-gray)' }}>
            <h2 className="text-lg font-bold mb-4 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>World State</h2>

            {gameState && (
              <div className="space-y-4">
                {/* Location */}
                <div>
                  <h3 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--tw-wave-blue)' }}>Location</h3>
                  <p className="text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.current_location || 'Unknown'}</p>
                </div>

                {/* Time of Day */}
                <div>
                  <h3 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--tw-wave-blue)' }}>Time of Day</h3>
                  <p className="text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.time_of_day || 'Day'}</p>
                </div>

                {/* Weather */}
                <div>
                  <h3 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--tw-wave-blue)' }}>Weather</h3>
                  <p className="text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.weather || 'Clear'}</p>
                </div>

                {/* Active Quest */}
                <div>
                  <h3 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--tw-wave-blue)' }}>Active Quest</h3>
                  <p className="text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.current_quest || 'Continue the adventure'}</p>
                </div>

                {/* NPCs Present */}
                {gameState.npcs_present && gameState.npcs_present.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--tw-wave-blue)' }}>NPCs Present</h3>
                    <ul className="space-y-1">
                      {gameState.npcs_present.map((npc: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-center" style={{ color: 'var(--tw-sapphire-blue)' }}>
                          <span className="mr-2" style={{ color: 'var(--tw-flamingo-pink)' }}>•</span> {npc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Character Name & Class */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--tw-mist-gray)' }}>
                  <h3 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--tw-wave-blue)' }}>Character</h3>
                  <p className="text-sm font-semibold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_name || 'Adventurer'}</p>
                  <p className="text-xs text-gray-600">{gameState.character_class || 'Warrior'}</p>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Character Stats Bottom Sheet (Mobile) */}
        <BottomSheet
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          title="Character Stats"
        >
          {gameState && (
            <div className="space-y-4">
              {gameState.level !== undefined && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Level & XP</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold headline" style={{ color: 'var(--tw-flamingo-pink)' }}>Lvl {gameState.level}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 mb-1">
                        {gameState.xp}/{gameState.xp_to_next_level} XP
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tw-mist-gray)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            background: 'linear-gradient(to right, var(--tw-wave-blue), var(--tw-flamingo-pink))',
                            width: `${((gameState.xp || 0) / (gameState.xp_to_next_level || 1)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {gameState.character_stats && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold mb-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Health & Mana</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          HP: {gameState.character_stats.hp}/{gameState.character_stats.max_hp}
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tw-mist-gray)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              backgroundColor: 'var(--tw-flamingo-pink)',
                              width: `${((gameState.character_stats.hp || 0) / (gameState.character_stats.max_hp || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      {gameState.character_stats.mana !== undefined && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">
                            Mana: {gameState.character_stats.mana}/{gameState.character_stats.max_mana}
                          </div>
                          <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tw-mist-gray)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                backgroundColor: 'var(--tw-wave-blue)',
                                width: `${((gameState.character_stats.mana || 0) / (gameState.character_stats.max_mana || 1)) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Attributes</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded border-2" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)', borderColor: 'var(--tw-wave-blue)' }}>
                        <div className="text-xs text-gray-600">Strength</div>
                        <div className="text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.strength}</div>
                      </div>
                      <div className="p-3 rounded border-2" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)', borderColor: 'var(--tw-wave-blue)' }}>
                        <div className="text-xs text-gray-600">Intelligence</div>
                        <div className="text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.intelligence}</div>
                      </div>
                      <div className="p-3 rounded border-2" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)', borderColor: 'var(--tw-wave-blue)' }}>
                        <div className="text-xs text-gray-600">Dexterity</div>
                        <div className="text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.dexterity}</div>
                      </div>
                      <div className="p-3 rounded border-2" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)', borderColor: 'var(--tw-wave-blue)' }}>
                        <div className="text-xs text-gray-600">Constitution</div>
                        <div className="text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.constitution}</div>
                      </div>
                      <div className="p-3 rounded border-2" style={{ background: 'linear-gradient(to bottom right, #EDF1F3, white)', borderColor: 'var(--tw-wave-blue)' }}>
                        <div className="text-xs text-gray-600">Charisma</div>
                        <div className="text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{gameState.character_stats.charisma}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {gameState.inventory && gameState.inventory.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Inventory</h3>
                  <ul className="space-y-1">
                    {gameState.inventory.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-center">
                        <span className="mr-2" style={{ color: 'var(--tw-flamingo-pink)' }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </BottomSheet>

        {/* Floating Stats Button */}
        <button
          onClick={() => setIsStatsOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-10"
          style={{ background: 'linear-gradient(to bottom right, var(--tw-flamingo-pink), var(--tw-wave-blue))' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(242, 97, 122, 0.1)' }}>
                  <svg className="w-6 h-6" style={{ color: 'var(--tw-flamingo-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Delete Chapter</h2>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this chapter? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-white border-2 rounded-lg hover:shadow-md transition-all font-semibold"
                  style={{ borderColor: 'var(--tw-sapphire-blue)', color: 'var(--tw-sapphire-blue)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteChapter}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'var(--tw-flamingo-pink)' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Chapter'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
