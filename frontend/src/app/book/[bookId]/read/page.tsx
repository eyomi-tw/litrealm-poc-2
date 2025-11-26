'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBook, type BookResponse } from '@/lib/api';

interface PageProps {
  params: Promise<{ bookId: string }>;
}

type Theme = 'light' | 'dark' | 'sepia';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

const THEME_STYLES: Record<Theme, { bg: string; text: string; accent: string; border: string; secondary: string }> = {
  light: {
    bg: '#FFFFFF',
    text: '#1a1a1a',
    accent: '#003D4F',
    border: '#e5e5e5',
    secondary: '#6b7280'
  },
  dark: {
    bg: '#1a1a1a',
    text: '#e5e5e5',
    accent: '#47A1AD',
    border: '#333333',
    secondary: '#9ca3af'
  },
  sepia: {
    bg: '#f4ecd8',
    text: '#5c4b37',
    accent: '#8b6914',
    border: '#d4c4a8',
    secondary: '#7c6b57'
  }
};

const FONT_SIZES: Record<FontSize, { prose: string; heading: string; lineHeight: string }> = {
  small: { prose: '0.875rem', heading: '1.5rem', lineHeight: '1.6' },
  medium: { prose: '1rem', heading: '1.75rem', lineHeight: '1.7' },
  large: { prose: '1.125rem', heading: '2rem', lineHeight: '1.8' },
  xlarge: { prose: '1.25rem', heading: '2.25rem', lineHeight: '1.9' }
};

export default function ReadingModePage({ params }: PageProps) {
  const { bookId } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<BookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [showControls, setShowControls] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('litrealms-reader-theme') as Theme | null;
    const savedFontSize = localStorage.getItem('litrealms-reader-fontsize') as FontSize | null;
    if (savedTheme) setTheme(savedTheme);
    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('litrealms-reader-theme', theme);
    localStorage.setItem('litrealms-reader-fontsize', fontSize);
  }, [theme, fontSize]);

  // Load book data
  useEffect(() => {
    const loadBook = async () => {
      if (!bookId) return;

      try {
        setIsLoading(true);
        const bookData = await getBook(bookId);
        setBook(bookData);
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [bookId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!book) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (currentChapterIndex > 0) {
            setCurrentChapterIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (currentChapterIndex < book.chapters.length - 1) {
            setCurrentChapterIndex(prev => prev + 1);
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            router.push(`/book/${bookId}`);
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, currentChapterIndex, isFullscreen, bookId, router]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const currentChapter = book?.chapters[currentChapterIndex];
  const themeStyles = THEME_STYLES[theme];
  const fontStyles = FONT_SIZES[fontSize];

  // Parse and render LitRPG elements
  const renderContent = (content: string) => {
    if (!content) return <p className="italic opacity-60">No content yet. Return to authoring to add content.</p>;

    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, idx) => {
      // Check for stat blocks (lines starting with stats like "HP:", "Level:", etc.)
      const isStatBlock = /^(HP|MP|Mana|Level|XP|STR|INT|DEX|CON|CHA|Strength|Intelligence|Dexterity|Constitution|Charisma):/mi.test(paragraph);

      // Check for system messages (often in brackets or with specific patterns)
      const isSystemMessage = /^\[.*\]$|^<.*>$|^\*\*.*\*\*$|^---.*---$/m.test(paragraph.trim());

      // Check for dialogue (lines starting with quotes)
      const isDialogue = /^["'"']/.test(paragraph.trim());

      if (isStatBlock) {
        return (
          <div
            key={idx}
            className="my-4 p-4 rounded-lg border-2 font-mono text-sm"
            style={{
              backgroundColor: theme === 'dark' ? '#2a2a2a' : theme === 'sepia' ? '#e8dcc8' : '#f5f5f5',
              borderColor: themeStyles.accent,
              color: themeStyles.text
            }}
          >
            <pre className="whitespace-pre-wrap">{paragraph}</pre>
          </div>
        );
      }

      if (isSystemMessage) {
        return (
          <div
            key={idx}
            className="my-4 p-3 rounded border-l-4 italic"
            style={{
              backgroundColor: theme === 'dark' ? '#252525' : theme === 'sepia' ? '#ebe3d3' : '#fafafa',
              borderColor: themeStyles.accent,
              color: themeStyles.secondary
            }}
          >
            {paragraph}
          </div>
        );
      }

      if (isDialogue) {
        return (
          <p
            key={idx}
            className="my-4"
            style={{
              color: themeStyles.text,
              fontSize: fontStyles.prose,
              lineHeight: fontStyles.lineHeight,
              fontStyle: 'normal'
            }}
          >
            {paragraph}
          </p>
        );
      }

      return (
        <p
          key={idx}
          className="my-4 first:mt-0"
          style={{
            color: themeStyles.text,
            fontSize: fontStyles.prose,
            lineHeight: fontStyles.lineHeight,
            textIndent: '1.5em'
          }}
        >
          {paragraph}
        </p>
      );
    });
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: themeStyles.bg }}
      >
        <div className="text-xl" style={{ color: themeStyles.text }}>Loading book...</div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: themeStyles.bg }}
      >
        <div className="text-xl" style={{ color: themeStyles.text }}>{error || 'Book not found'}</div>
        <button
          onClick={() => router.push(`/book/${bookId}`)}
          className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: themeStyles.accent, color: '#fff' }}
        >
          Back to Book
        </button>
      </div>
    );
  }

  if (book.chapters.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: themeStyles.bg }}
      >
        <div className="text-xl" style={{ color: themeStyles.text }}>No chapters available to read.</div>
        <button
          onClick={() => router.push(`/book/${bookId}`)}
          className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: themeStyles.accent, color: '#fff' }}
        >
          Back to Book
        </button>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;600&display=swap');

        .reader-prose {
          font-family: 'Lora', Georgia, serif;
        }

        .reader-headline {
          font-family: 'Bitter', serif;
        }

        .reader-ui {
          font-family: 'Inter', sans-serif;
        }

        /* Smooth transitions */
        .reader-transition {
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Custom scrollbar for dark theme */
        .dark-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .dark-scrollbar::-webkit-scrollbar-track {
          background: #2a2a2a;
        }

        .dark-scrollbar::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 4px;
        }

        .dark-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>

      <div
        className={`min-h-screen reader-transition ${theme === 'dark' ? 'dark-scrollbar' : ''}`}
        style={{ backgroundColor: themeStyles.bg }}
      >
        {/* Top Control Bar */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
            showControls ? 'translate-y-0' : '-translate-y-full'
          }`}
          style={{ backgroundColor: themeStyles.bg, borderBottom: `1px solid ${themeStyles.border}` }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Back button and title */}
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => router.push(`/book/${bookId}`)}
                  className="p-2 rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
                  style={{ color: themeStyles.text }}
                  title="Back to book (Esc)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <h1
                    className="text-sm font-semibold truncate reader-headline"
                    style={{ color: themeStyles.text }}
                  >
                    {book.title}
                  </h1>
                  <p className="text-xs truncate" style={{ color: themeStyles.secondary }}>
                    {currentChapter?.title || 'Chapter'}
                  </p>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Table of Contents */}
                <button
                  onClick={() => setShowToc(!showToc)}
                  className={`p-2 rounded-lg transition-colors ${showToc ? 'ring-2' : ''}`}
                  style={{
                    color: themeStyles.text,
                    ringColor: themeStyles.accent
                  }}
                  title="Table of Contents"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>

                {/* Theme Toggle */}
                <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: themeStyles.border }}>
                  {(['light', 'sepia', 'dark'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-1.5 rounded transition-all ${theme === t ? 'ring-2' : ''}`}
                      style={{
                        backgroundColor: theme === t ? themeStyles.bg : 'transparent',
                        ringColor: themeStyles.accent
                      }}
                      title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
                    >
                      {t === 'light' && (
                        <svg className="w-4 h-4" style={{ color: '#fbbf24' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                      {t === 'sepia' && (
                        <svg className="w-4 h-4" style={{ color: '#92400e' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                      {t === 'dark' && (
                        <svg className="w-4 h-4" style={{ color: '#6366f1' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                {/* Font Size */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const sizes: FontSize[] = ['small', 'medium', 'large', 'xlarge'];
                      const idx = sizes.indexOf(fontSize);
                      if (idx > 0) setFontSize(sizes[idx - 1]);
                    }}
                    disabled={fontSize === 'small'}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30"
                    style={{ color: themeStyles.text }}
                    title="Decrease font size"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-xs font-medium w-6 text-center" style={{ color: themeStyles.secondary }}>
                    {fontSize === 'small' ? 'S' : fontSize === 'medium' ? 'M' : fontSize === 'large' ? 'L' : 'XL'}
                  </span>
                  <button
                    onClick={() => {
                      const sizes: FontSize[] = ['small', 'medium', 'large', 'xlarge'];
                      const idx = sizes.indexOf(fontSize);
                      if (idx < sizes.length - 1) setFontSize(sizes[idx + 1]);
                    }}
                    disabled={fontSize === 'xlarge'}
                    className="p-2 rounded-lg transition-colors disabled:opacity-30"
                    style={{ color: themeStyles.text }}
                    title="Increase font size"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: themeStyles.text }}
                  title="Toggle fullscreen (Ctrl/Cmd + F)"
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V5m0 4H5m0 0L9 5m6 4V5m0 4h4m0 0l-4-4m-6 10v4m0-4H5m4 4L5 15m10 4v-4m0 4h4m-4-4l4 4" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* Hide Controls */}
                <button
                  onClick={() => setShowControls(false)}
                  className="p-2 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: themeStyles.text }}
                  title="Hide controls (click anywhere to show)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table of Contents Sidebar */}
        {showToc && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setShowToc(false)}
            />
            <div
              className="fixed top-0 right-0 h-full w-80 max-w-full z-50 overflow-y-auto shadow-2xl"
              style={{ backgroundColor: themeStyles.bg }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-lg font-bold reader-headline"
                    style={{ color: themeStyles.text }}
                  >
                    Chapters
                  </h2>
                  <button
                    onClick={() => setShowToc(false)}
                    className="p-2 rounded-lg transition-colors hover:opacity-70"
                    style={{ color: themeStyles.text }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1">
                  {book.chapters.map((chapter, idx) => (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        setCurrentChapterIndex(idx);
                        setShowToc(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        currentChapterIndex === idx ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: currentChapterIndex === idx
                          ? (theme === 'dark' ? '#2a2a2a' : theme === 'sepia' ? '#e8dcc8' : '#f5f5f5')
                          : 'transparent',
                        color: themeStyles.text,
                        ringColor: themeStyles.accent
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: themeStyles.secondary }}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{chapter.title}</div>
                          <div className="text-xs" style={{ color: themeStyles.secondary }}>
                            {chapter.word_count.toLocaleString()} words
                          </div>
                        </div>
                        {currentChapterIndex === idx && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: themeStyles.accent }}
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main Reading Area */}
        <main
          className="max-w-2xl mx-auto px-6 py-24 cursor-pointer"
          onClick={() => !showControls && setShowControls(true)}
        >
          {/* Chapter Header */}
          <header className="mb-12 text-center">
            <div
              className="text-sm font-medium mb-2 reader-ui"
              style={{ color: themeStyles.secondary }}
            >
              Chapter {currentChapterIndex + 1}
            </div>
            <h2
              className="text-3xl font-bold reader-headline"
              style={{
                color: themeStyles.text,
                fontSize: fontStyles.heading
              }}
            >
              {currentChapter?.title}
            </h2>
          </header>

          {/* Chapter Content */}
          <article className="reader-prose">
            {renderContent(currentChapter?.authored_content || '')}
          </article>

          {/* Chapter Navigation */}
          <nav className="mt-16 pt-8 border-t" style={{ borderColor: themeStyles.border }}>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => currentChapterIndex > 0 && setCurrentChapterIndex(prev => prev - 1)}
                disabled={currentChapterIndex === 0}
                className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
                style={{
                  backgroundColor: theme === 'dark' ? '#2a2a2a' : theme === 'sepia' ? '#e8dcc8' : '#f5f5f5',
                  color: themeStyles.text
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Previous</span>
              </button>

              <span className="text-sm" style={{ color: themeStyles.secondary }}>
                {currentChapterIndex + 1} / {book.chapters.length}
              </span>

              <button
                onClick={() => currentChapterIndex < book.chapters.length - 1 && setCurrentChapterIndex(prev => prev + 1)}
                disabled={currentChapterIndex === book.chapters.length - 1}
                className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
                style={{
                  backgroundColor: theme === 'dark' ? '#2a2a2a' : theme === 'sepia' ? '#e8dcc8' : '#f5f5f5',
                  color: themeStyles.text
                }}
              >
                <span className="text-sm font-medium">Next</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </nav>

          {/* End of Book */}
          {currentChapterIndex === book.chapters.length - 1 && (
            <div className="mt-12 text-center">
              <p
                className="text-lg font-medium mb-4 reader-headline"
                style={{ color: themeStyles.text }}
              >
                End of available chapters
              </p>
              <button
                onClick={() => router.push(`/book/${bookId}`)}
                className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: themeStyles.accent, color: '#fff' }}
              >
                Back to Book Overview
              </button>
            </div>
          )}
        </main>

        {/* Show Controls Hint (when hidden) */}
        {!showControls && (
          <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs animate-pulse"
            style={{
              backgroundColor: themeStyles.border,
              color: themeStyles.secondary
            }}
          >
            Click anywhere to show controls
          </div>
        )}
      </div>
    </>
  );
}
