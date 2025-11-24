'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { getBook, updateBook, deleteChapter, type BookResponse } from '@/lib/api';

interface PageProps {
  params: Promise<{ bookId: string }>;
}

export default function BookOverviewPage({ params }: PageProps) {
  const { bookId } = use(params);
  const router = useRouter();
  const [book, setBook] = useState<BookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrologueExpanded, setIsPrologueExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCharacterName, setEditCharacterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return { bg: 'var(--tw-jade-green)', text: 'white' };
      case 'in_progress':
        return { bg: 'var(--tw-wave-blue)', text: 'white' };
      case 'published':
        return { bg: 'var(--tw-amethyst-purple)', text: 'white' };
      default: // draft
        return { bg: 'var(--tw-mist-gray)', text: 'var(--tw-sapphire-blue)' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'complete':
        return 'Complete';
      case 'published':
        return 'Published';
      default:
        return 'Draft';
    }
  };

  const handleOpenEditModal = () => {
    if (book) {
      setEditTitle(book.title);
      setEditCharacterName(book.game_config.character.name);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!book) return;

    try {
      setIsSaving(true);
      const updates: { title?: string; character_name?: string } = {};

      if (editTitle !== book.title) {
        updates.title = editTitle;
      }
      if (editCharacterName !== book.game_config.character.name) {
        updates.character_name = editCharacterName;
      }

      if (Object.keys(updates).length > 0) {
        const updatedBook = await updateBook(bookId, updates);
        setBook(updatedBook);
      }

      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating book:', err);
      setError('Failed to update book. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteModal = (chapterId: string) => {
    setChapterToDelete(chapterId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteChapter = async () => {
    if (!chapterToDelete) return;

    try {
      setIsDeleting(true);
      await deleteChapter(chapterToDelete);

      // Refresh the book data to show updated chapter list
      const updatedBook = await getBook(bookId);
      setBook(updatedBook);

      setSuccessMessage('Chapter deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsDeleteModalOpen(false);
      setChapterToDelete(null);
    } catch (err) {
      console.error('Error deleting chapter:', err);
      setError('Failed to delete chapter. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Inter:wght@400;600&display=swap');

          :root {
            --tw-flamingo-pink: #F2617A;
            --tw-wave-blue: #47A1AD;
            --tw-sapphire-blue: #003D4F;
            --tw-mist-gray: #EDF1F3;
            --tw-jade-green: #6B9E78;
            --tw-amethyst-purple: #634F7D;
          }

          body {
            font-family: 'Inter', sans-serif;
          }

          .headline {
            font-family: 'Bitter', serif;
          }
        `}</style>
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #EDF1F3, white)' }}>
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-xl headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Loading book...</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (error || !book) {
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
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #EDF1F3, white)' }}>
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="text-xl headline" style={{ color: 'var(--tw-flamingo-pink)' }}>{error || 'Book not found'}</div>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                style={{ background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}
              >
                Go Home
              </button>
            </div>
          </main>
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
          --tw-jade-green: #6B9E78;
          --tw-amethyst-purple: #634F7D;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .headline {
          font-family: 'Bitter', serif;
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #EDF1F3, white)' }}>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 rounded-lg border-2 text-center font-semibold" style={{ backgroundColor: 'var(--tw-jade-green)', borderColor: 'var(--tw-jade-green)', color: 'white' }}>
              {successMessage}
            </div>
          )}

          {/* Book Header */}
          <div className="bg-gradient-to-br from-[#EDF1F3] to-white border-2 rounded-xl p-4 md:p-5 mb-4 md:mb-5 shadow-lg" style={{ borderColor: 'var(--tw-sapphire-blue)' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{book.title}</h1>
              <button
                onClick={handleOpenEditModal}
                className="p-2 rounded-lg hover:bg-white transition-colors"
                style={{ color: 'var(--tw-wave-blue)' }}
                title="Edit book details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            {book.subtitle && (
              <p className="text-base md:text-lg text-gray-700 mb-4">{book.subtitle}</p>
            )}

            {/* Book Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--tw-wave-blue)' }}>
                <div className="text-gray-600 text-xs md:text-sm mb-1 font-medium">Chapters</div>
                <div className="text-2xl md:text-3xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>{book.chapters.length}</div>
              </div>
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--tw-wave-blue)' }}>
                <div className="text-gray-600 text-xs md:text-sm mb-1 font-medium">Total Words</div>
                <div className="text-2xl md:text-3xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  {book.total_word_count.toLocaleString()}
                </div>
              </div>
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--tw-wave-blue)' }}>
                <div className="text-gray-600 text-xs md:text-sm mb-1 font-medium">Character</div>
                <div className="text-base md:text-lg font-semibold truncate" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  {book.game_config.character.name}
                </div>
              </div>
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--tw-wave-blue)' }}>
                <div className="text-gray-600 text-xs md:text-sm mb-1 font-medium">World</div>
                <div className="text-base md:text-lg font-semibold truncate" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  {book.game_config.world.name}
                </div>
              </div>
            </div>
          </div>

          {/* Prologue Section */}
          {book.game_config.story.prologue?.generatedPrologue && (
            <div className="bg-white border-2 rounded-xl p-4 md:p-5 mb-4 md:mb-5 shadow-lg" style={{ borderColor: 'var(--tw-amethyst-purple)' }}>
              <button
                onClick={() => setIsPrologueExpanded(!isPrologueExpanded)}
                className="w-full flex items-center justify-between gap-3 mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" style={{ color: 'var(--tw-amethyst-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h2 className="text-lg md:text-xl font-bold headline" style={{ color: 'var(--tw-sapphire-blue)' }}>Prologue</h2>
                </div>
                <svg
                  className={`w-6 h-6 transition-transform ${isPrologueExpanded ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--tw-sapphire-blue)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isPrologueExpanded && (
                <div className="text-gray-600 text-sm italic">
                  Click to read the opening of your adventure...
                </div>
              )}

              {isPrologueExpanded && (
                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap mt-4 pt-4 border-t border-gray-200">
                  {book.game_config.story.prologue.generatedPrologue}
                </div>
              )}
            </div>
          )}

          {/* Chapters List */}
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-bold headline mb-4" style={{ color: 'var(--tw-sapphire-blue)' }}>Chapters</h2>

            {book.chapters.length === 0 ? (
              <div className="bg-gradient-to-br from-[#EDF1F3] to-white border-2 rounded-xl p-4 md:p-5 text-center shadow-lg" style={{ borderColor: 'var(--tw-wave-blue)' }}>
                <p className="text-gray-700 mb-4 text-sm md:text-base leading-relaxed">No chapters yet. Start your first chapter to begin your adventure!</p>
                <button
                  onClick={() => router.push(`/gameplay?session=${book.chapters[0]?.session_id || ''}`)}
                  className="px-8 py-3 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-base md:text-lg"
                  style={{ background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}
                >
                  Start First Chapter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {book.chapters.map((chapter) => {
                  const statusColors = getStatusColor(chapter.status);
                  return (
                    <div
                      key={chapter.id}
                      className="w-full bg-white border-2 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all group"
                      style={{ borderColor: 'var(--tw-wave-blue)' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Chapter Info - Clickable */}
                        <button
                          onClick={() => router.push(`/book/${bookId}/chapter/${chapter.id}`)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-gray-600 text-sm font-semibold">
                              Chapter {chapter.number}
                            </span>
                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text
                              }}
                            >
                              {getStatusLabel(chapter.status)}
                            </span>
                          </div>
                          <h3 className="text-base md:text-lg font-bold headline mb-2 transition-colors" style={{ color: 'var(--tw-sapphire-blue)' }}>
                            {chapter.title}
                          </h3>
                          <div className="flex items-center gap-4 text-xs md:text-sm text-gray-600 flex-wrap">
                            <span className="font-medium">{chapter.word_count.toLocaleString()} words</span>
                            <span>•</span>
                            <span>Last edited: {new Date(chapter.last_edited).toLocaleDateString()}</span>
                          </div>
                        </button>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(chapter.id);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            style={{ color: 'var(--tw-flamingo-pink)' }}
                            title="Delete chapter"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button
                            onClick={() => router.push(`/book/${bookId}/chapter/${chapter.id}`)}
                            className="transition-all"
                            style={{ color: 'var(--tw-wave-blue)' }}
                          >
                            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex gap-4 flex-wrap">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-white hover:shadow-md rounded-lg transition-all border-2 font-semibold"
              style={{ borderColor: 'var(--tw-sapphire-blue)', color: 'var(--tw-sapphire-blue)' }}
            >
              Back to Home
            </button>
            {book.chapters.length > 0 && (
              <button
                onClick={() => {
                  const lastChapter = book.chapters[book.chapters.length - 1];
                  router.push(`/book/${bookId}/chapter/${lastChapter.id}`);
                }}
                className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                style={{ background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}
              >
                Continue Writing
              </button>
            )}
          </div>
        </main>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-xl font-bold headline mb-4" style={{ color: 'var(--tw-sapphire-blue)' }}>Edit Book Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--tw-wave-blue)',
                      '--tw-ring-color': 'var(--tw-wave-blue)'
                    } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    Character Name
                  </label>
                  <input
                    type="text"
                    value={editCharacterName}
                    onChange={(e) => setEditCharacterName(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--tw-wave-blue)',
                      '--tw-ring-color': 'var(--tw-wave-blue)'
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-white border-2 rounded-lg hover:shadow-md transition-all font-semibold"
                  style={{ borderColor: 'var(--tw-sapphire-blue)', color: 'var(--tw-sapphire-blue)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))' }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setChapterToDelete(null);
                  }}
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
