'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import MobileDrawer from '@/components/shared/MobileDrawer';
import {
  compileStory,
  CompiledStoryResponse,
  CompiledStory,
  StoryChapter,
  saveStoryDraft,
  enhanceNarrative
} from '@/lib/api';
import jsPDF from 'jspdf';

function AuthoringContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [compiledStory, setCompiledStory] = useState<CompiledStoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedNarrative, setEditedNarrative] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSubtitle, setEditedSubtitle] = useState('');
  const [editedChapters, setEditedChapters] = useState<StoryChapter[]>([]);
  const [editedCharacterArc, setEditedCharacterArc] = useState('');
  const [editedKeyMoments, setEditedKeyMoments] = useState<string[]>([]);

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeChapter, setActiveChapter] = useState<number>(0);

  // Refs for chapter scrolling
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isChaptersDrawerOpen, setIsChaptersDrawerOpen] = useState(false);

  useEffect(() => {
    const session = searchParams.get('session');
    if (session) {
      setSessionId(session);
      loadCompiledStory(session);
    } else {
      setError('No session ID provided');
      setIsLoading(false);
    }
  }, [searchParams]);

  const loadCompiledStory = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await compileStory(sessionId);
      setCompiledStory(response);

      // Initialize editable fields
      setEditedTitle(response.compiled_story.title);
      setEditedSubtitle(response.compiled_story.subtitle);
      setEditedNarrative(response.compiled_story.narrative);
      setEditedChapters([...response.compiled_story.chapters]);
      setEditedCharacterArc(response.compiled_story.character_arc);
      setEditedKeyMoments([...response.compiled_story.key_moments]);
    } catch (err) {
      console.error('Error loading compiled story:', err);
      setError('Failed to load story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!sessionId || !compiledStory) return;

    try {
      setIsSaving(true);
      setSaveMessage('');

      const updatedStory: CompiledStory = {
        ...compiledStory.compiled_story,
        title: editedTitle,
        subtitle: editedSubtitle,
        narrative: editedNarrative,
        chapters: editedChapters,
        character_arc: editedCharacterArc,
        key_moments: editedKeyMoments,
      };

      await saveStoryDraft(sessionId, updatedStory);

      // Update local state
      setCompiledStory({
        ...compiledStory,
        compiled_story: updatedStory
      });

      setSaveMessage('Draft saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving draft:', error);
      setSaveMessage('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnhanceNarrative = async () => {
    if (!sessionId) return;

    try {
      setIsEnhancing(true);
      const response = await enhanceNarrative(
        sessionId,
        editedNarrative,
        `Title: ${editedTitle}. Genre: ${compiledStory?.compiled_story.metadata.genre || 'Fantasy'}`
      );
      setEditedNarrative(response.enhanced_narrative);
    } catch (error) {
      console.error('Error enhancing narrative:', error);
      alert('Failed to enhance narrative. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleExportPDF = () => {
    if (!compiledStory) return;

    try {
      setIsExporting(true);
      const doc = new jsPDF();
      const story = compiledStory.compiled_story;

      // Title page
      doc.setFontSize(24);
      doc.text(editedTitle, 105, 50, { align: 'center' });
      doc.setFontSize(16);
      doc.text(editedSubtitle, 105, 65, { align: 'center' });

      // Metadata
      doc.setFontSize(10);
      doc.text(`By ${story.metadata.character_name}`, 105, 85, { align: 'center' });
      doc.text(`${story.metadata.world} - ${story.metadata.tone}`, 105, 92, { align: 'center' });

      // Add new page for content
      doc.addPage();
      doc.setFontSize(12);

      // Add narrative
      const splitNarrative = doc.splitTextToSize(editedNarrative, 170);
      let yPosition = 20;

      splitNarrative.forEach((line: string) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 7;
      });

      // Add chapters summary
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Chapters', 20, 20);
      yPosition = 35;

      editedChapters.forEach((chapter) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.text(`Chapter ${chapter.number}: ${chapter.title}`, 20, yPosition);
        yPosition += 10;
        doc.setFontSize(10);
        const splitSummary = doc.splitTextToSize(chapter.summary, 170);
        splitSummary.forEach((line: string) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });
        yPosition += 10;
      });

      // Save PDF
      doc.save(`${editedTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackToGame = () => {
    if (sessionId) {
      router.push(`/gameplay?session=${sessionId}`);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const updateChapter = (index: number, field: keyof StoryChapter, value: string | number) => {
    const newChapters = [...editedChapters];
    newChapters[index] = { ...newChapters[index], [field]: value };
    setEditedChapters(newChapters);
  };

  const addKeyMoment = () => {
    setEditedKeyMoments([...editedKeyMoments, 'New key moment']);
  };

  const updateKeyMoment = (index: number, value: string) => {
    const newMoments = [...editedKeyMoments];
    newMoments[index] = value;
    setEditedKeyMoments(newMoments);
  };

  const removeKeyMoment = (index: number) => {
    setEditedKeyMoments(editedKeyMoments.filter((_, i) => i !== index));
  };

  const scrollToChapter = (chapterIndex: number) => {
    setActiveChapter(chapterIndex);
    // Close drawer on mobile after selecting chapter
    setIsChaptersDrawerOpen(false);
    // Scroll to the specific chapter in the middle panel
    if (chapterRefs.current[chapterIndex]) {
      chapterRefs.current[chapterIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Parse narrative into chapter sections
  const parseChapters = (narrative: string) => {
    const chapterRegex = /^# Chapter \d+:/gm;
    const matches = Array.from(narrative.matchAll(chapterRegex));

    if (matches.length === 0) {
      return [{ chapterNum: 0, content: narrative, startIndex: 0 }];
    }

    const sections = matches.map((match, idx) => {
      const startIndex = match.index || 0;
      const endIndex = matches[idx + 1]?.index || narrative.length;
      return {
        chapterNum: idx,
        content: narrative.slice(startIndex, endIndex),
        startIndex
      };
    });

    return sections;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header currentPage="authoring" showAuth={true} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
            <p className="text-neutral-600">Compiling your story...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !compiledStory) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header currentPage="authoring" showAuth={true} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="text-neutral-600 mb-6">{error || 'Story not found'}</p>
            <button
              onClick={() => router.push('/gameplay')}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800"
            >
              Back to Gameplay
            </button>
          </div>
        </main>
      </div>
    );
  }

  const story = compiledStory.compiled_story;

  return (
    <div className="h-screen bg-neutral-50 flex flex-col">
      <Header currentPage="authoring" showAuth={true} />

      {/* Top Action Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsChaptersDrawerOpen(true)}
            className="lg:hidden p-2 hover:bg-neutral-100 rounded transition"
            aria-label="Open chapters menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h2 className="text-base md:text-lg font-semibold">Story Authoring</h2>
          <span className="hidden md:inline text-sm text-neutral-500">
            Session: {sessionId?.slice(0, 8)}... • Status: {isEditMode ? 'Editing' : 'Viewing'}
          </span>
        </div>
        <div className="flex items-center space-x-1 md:space-x-2">
          {saveMessage && (
            <span className="text-sm text-green-600 mr-2">{saveMessage}</span>
          )}
          <button
            onClick={toggleEditMode}
            className={`px-2 md:px-4 py-2 text-xs md:text-sm rounded ${
              isEditMode
                ? 'bg-black text-white hover:bg-neutral-800'
                : 'bg-white border border-neutral-300 hover:bg-neutral-50'
            }`}
            title="Toggle Edit Mode"
          >
            <span className="hidden md:inline">{isEditMode ? '✓ Edit Mode' : '✏️ Edit Mode'}</span>
            <span className="md:hidden">{isEditMode ? '✓' : '✏️'}</span>
          </button>
          <button
            onClick={handleBackToGame}
            className="hidden md:block px-4 py-2 text-sm bg-white border border-neutral-300 rounded hover:bg-neutral-50"
          >
            🎮 Back to Game
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || !isEditMode}
            className="hidden md:block px-4 py-2 text-sm bg-white border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '⏳' : '💾'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-3 md:px-4 py-2 text-xs md:text-sm bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
            title="Export PDF"
          >
            <span className="hidden md:inline">{isExporting ? '⏳ Exporting...' : '📄 Export PDF'}</span>
            <span className="md:hidden">{isExporting ? '⏳' : '📄'}</span>
          </button>
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chapters (hidden on mobile) */}
        <aside className="hidden lg:flex lg:w-64 bg-white border-r border-neutral-200 p-4 flex-col h-full">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">Story Chapters</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {editedChapters.map((chapter, idx) => (
                <div
                  key={chapter.number}
                  onClick={() => scrollToChapter(idx)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    activeChapter === idx
                      ? 'bg-black text-white'
                      : 'bg-neutral-50 hover:bg-neutral-100'
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`font-medium text-sm mb-1 w-full border-b outline-none bg-transparent ${
                          activeChapter === idx
                            ? 'border-neutral-400 text-white'
                            : 'border-neutral-300 text-neutral-900'
                        }`}
                      />
                      <div className={`text-xs ${activeChapter === idx ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {chapter.word_count} words
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-sm mb-1">
                        Chapter {chapter.number}: {chapter.title}
                      </div>
                      <div className={`text-xs ${activeChapter === idx ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {chapter.word_count} words
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          <div className="max-w-4xl mx-auto">
            {/* Story Header */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
              <div className="mb-4">
                {isEditMode ? (
                  <>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-3xl font-bold mb-2 w-full border-b border-neutral-300 focus:border-neutral-500 outline-none"
                    />
                    <input
                      type="text"
                      value={editedSubtitle}
                      onChange={(e) => setEditedSubtitle(e.target.value)}
                      className="text-lg text-neutral-600 w-full border-b border-neutral-300 focus:border-neutral-500 outline-none"
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold mb-2">{editedTitle}</h1>
                    <p className="text-lg text-neutral-600">{editedSubtitle}</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-neutral-500">Character</div>
                  <div className="font-medium">{story.metadata.character_name}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Class</div>
                  <div className="font-medium">{story.metadata.character_class}</div>
                </div>
                <div>
                  <div className="text-neutral-500">World</div>
                  <div className="font-medium">{story.metadata.world}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Tone</div>
                  <div className="font-medium">{story.metadata.tone}</div>
                </div>
              </div>
            </div>

            {/* Story Narrative */}
            <div className="bg-white border border-neutral-200 rounded-lg p-8 mb-6">
              {isEditMode && (
                <div className="mb-4 flex items-center space-x-2">
                  <button
                    onClick={handleEnhanceNarrative}
                    disabled={isEnhancing}
                    className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {isEnhancing ? '⏳ Enhancing...' : '✨ AI Enhance'}
                  </button>
                  <span className="text-xs text-neutral-500">
                    Use AI to improve prose, imagery, and flow
                  </span>
                </div>
              )}
              <div className="prose prose-neutral max-w-none">
                {isEditMode ? (
                  <textarea
                    value={editedNarrative}
                    onChange={(e) => setEditedNarrative(e.target.value)}
                    className="w-full min-h-[400px] p-4 border border-neutral-300 rounded focus:border-neutral-500 outline-none font-serif text-base leading-relaxed"
                    placeholder="Write your narrative here..."
                  />
                ) : (
                  <>
                    {parseChapters(editedNarrative).map((section, idx) => (
                      <div
                        key={idx}
                        ref={(el) => {
                          chapterRefs.current[idx] = el;
                        }}
                        className="mb-6"
                        dangerouslySetInnerHTML={{
                          __html: section.content.replace(/\n/g, '<br />')
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Right Sidebar - Stats, Character Arc & Key Moments (hidden on mobile) */}
        <aside className="hidden xl:flex xl:w-80 bg-white border-l border-neutral-200 p-4 flex-col h-full overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Story Statistics</h3>
            <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Scenes:</span>
                  <span className="font-medium">{story.metadata.total_scenes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chapters:</span>
                  <span className="font-medium">{editedChapters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Level:</span>
                  <span className="font-medium">{story.metadata.final_level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Playtime:</span>
                  <span className="font-medium">{story.metadata.playtime_estimate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Word Count:</span>
                  <span className="font-medium">
                    {editedChapters.reduce((sum, ch) => sum + ch.word_count, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Character Arc</h3>
            <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
              {isEditMode ? (
                <textarea
                  value={editedCharacterArc}
                  onChange={(e) => setEditedCharacterArc(e.target.value)}
                  className="w-full min-h-[120px] p-3 border border-neutral-300 rounded focus:border-neutral-500 outline-none text-sm bg-white"
                />
              ) : (
                <p className="text-neutral-700 text-sm">{editedCharacterArc}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Key Moments</h3>
              {isEditMode && (
                <button
                  onClick={addKeyMoment}
                  className="text-xs text-neutral-600 hover:text-neutral-900"
                >
                  + Add
                </button>
              )}
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
              <ul className="space-y-2">
                {editedKeyMoments.map((moment, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-neutral-400">•</span>
                    {isEditMode ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={moment}
                          onChange={(e) => updateKeyMoment(idx, e.target.value)}
                          className="flex-1 text-xs border-b border-neutral-300 focus:border-neutral-500 outline-none bg-white px-1"
                        />
                        <button
                          onClick={() => removeKeyMoment(idx)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-700 text-xs">{moment}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </main>

      {/* Mobile Chapters Drawer */}
      <MobileDrawer
        isOpen={isChaptersDrawerOpen}
        onClose={() => setIsChaptersDrawerOpen(false)}
        title="Navigation"
        position="left"
      >
        <div className="p-4">
          {/* Mobile Action Button */}
          <div className="mb-6">
            <button
              onClick={handleBackToGame}
              className="w-full px-4 py-3 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-lg transition font-medium text-left"
            >
              🎮 Back to Game
            </button>
          </div>

          {/* Chapter List */}
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">Story Chapters</h3>
          <div className="space-y-2 mb-6">
            {editedChapters.map((chapter, idx) => (
              <div
                key={chapter.number}
                onClick={() => scrollToChapter(idx)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  activeChapter === idx
                    ? 'bg-black text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                <div className="font-medium text-sm mb-1">
                  Chapter {chapter.number}: {chapter.title}
                </div>
                <div className={`text-xs ${activeChapter === idx ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {chapter.word_count} words
                </div>
              </div>
            ))}
          </div>

          {/* Character Arc Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Character Arc</h3>
            <div className="bg-neutral-50 p-3 rounded-lg text-sm text-neutral-700 leading-relaxed">
              {editedCharacterArc || 'No character arc defined yet'}
            </div>
          </div>

          {/* Key Moments Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Key Moments</h3>
            {editedKeyMoments && editedKeyMoments.length > 0 ? (
              <ul className="space-y-2">
                {editedKeyMoments.map((moment, idx) => (
                  <li key={idx} className="text-sm text-neutral-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span className="flex-1">{moment}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-neutral-500 italic">No key moments yet</div>
            )}
          </div>
        </div>
      </MobileDrawer>

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white z-10">
        <div className="flex gap-2 p-2">
          <button
            onClick={toggleEditMode}
            className={`flex-1 px-4 py-2 text-sm rounded-lg font-medium transition ${
              isEditMode
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-900'
            }`}
          >
            {isEditMode ? '✓ Edit Mode' : '✏️ Edit Mode'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-red-700 text-white text-sm rounded-lg font-medium hover:bg-red-800 transition disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : '📖 Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthoringPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthoringContent />
    </Suspense>
  );
}
