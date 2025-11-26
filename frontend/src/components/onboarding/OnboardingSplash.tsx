'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { listBooks, deleteBook, getBook, type BookResponse } from '@/lib/api';
import jsPDF from 'jspdf';

export default function OnboardingSplash() {
  const router = useRouter();
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [bookToDelete, setBookToDelete] = useState<BookResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingBookId, setExportingBookId] = useState<string | null>(null);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setIsLoadingBooks(true);
        const userBooks = await listBooks();
        setBooks(userBooks);
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    loadBooks();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, book: BookResponse) => {
    e.stopPropagation();
    setBookToDelete(book);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;

    try {
      setIsDeleting(true);
      await deleteBook(bookToDelete.id);
      setBooks(books.filter(b => b.id !== bookToDelete.id));
      setBookToDelete(null);
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setBookToDelete(null);
  };

  const handleExportBook = async (e: React.MouseEvent, book: BookResponse) => {
    e.stopPropagation();

    try {
      setExportingBookId(book.id);

      // Get fresh book data with all chapters
      const fullBook = await getBook(book.id);

      const doc = new jsPDF();

      // Title page
      doc.setFontSize(24);
      doc.text(fullBook.title, 105, 50, { align: 'center' });
      if (fullBook.subtitle) {
        doc.setFontSize(16);
        doc.text(fullBook.subtitle, 105, 65, { align: 'center' });
      }

      // Metadata
      doc.setFontSize(10);
      doc.text(`By ${fullBook.game_config.character.name}`, 105, 85, { align: 'center' });
      doc.text(`${fullBook.game_config.world.name} - ${fullBook.game_config.tone}`, 105, 92, { align: 'center' });
      doc.text(`${fullBook.chapters.length} chapters - ${fullBook.total_word_count.toLocaleString()} words`, 105, 99, { align: 'center' });

      // Add chapters
      fullBook.chapters.forEach((chapter, index) => {
        doc.addPage();

        // Chapter title
        doc.setFontSize(18);
        doc.text(`Chapter ${chapter.number}: ${chapter.title}`, 20, 20);

        // Chapter content
        doc.setFontSize(12);
        let yPosition = 35;

        const content = chapter.authored_content || '(No content yet)';
        const splitContent = doc.splitTextToSize(content, 170);

        splitContent.forEach((line: string) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 7;
        });
      });

      // Generate filename
      const safeTitle = fullBook.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeTitle}.pdf`);

    } catch (error) {
      console.error('Error exporting book:', error);
      alert('Failed to export book. Please try again.');
    } finally {
      setExportingBookId(null);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Inter:wght@400;600&display=swap');

        :root {
          --tw-onyx-black: #000000;
          --tw-mist-gray: #EDF1F3;
          --tw-flamingo-pink: #F2617A;
          --tw-wave-blue: #47A1AD;
          --tw-turmeric-yellow: #CC850A;
          --tw-jade-green: #6B9E78;
          --tw-sapphire-blue: #003D4F;
          --tw-amethyst-purple: #634F7D;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .headline {
          font-family: 'Bitter', serif;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-pulse-custom {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(25%);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }

        .animate-bounce-slow {
          animation: bounce 2s infinite;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg sticky top-0 z-50 border-b border-neutral-200 px-2 md:px-3 py-2">
        <div className="flex items-center justify-center md:justify-start">
          <a href="/" className="flex items-center space-x-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Thoughtworks_logo.png/1200px-Thoughtworks_logo.png"
              alt="Thoughtworks Logo"
              className="h-6"
            />
            <span className="text-neutral-300">|</span>
            <span className="text-base font-semibold">LitRealms</span>
          </a>
        </div>
      </header>

      <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
          {/* Main Content */}
          <div className="text-center mb-6 md:mb-8">
            <h2 className="headline text-2xl md:text-3xl font-bold mb-3 md:mb-4 leading-tight" style={{ color: 'var(--tw-sapphire-blue)' }}>
              Welcome to LitRealms
            </h2>
            <p className="text-base md:text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed mb-6 md:mb-8">
              This isn't a concept demo. It's a working, end-to-end prototype powered by live AI agents—built to show what interactive publishing could become. The interface is intentionally lightweight so the focus stays on proving the system works.
            </p>

            {/* Primary CTA */}
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/onboarding/step/1')}
                className="px-12 md:px-16 py-4 md:py-5 text-white rounded-lg font-bold shadow-xl text-lg md:text-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                style={{
                  background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))',
                }}
              >
                Start a New Adventure
              </button>
            </div>
          </div>

          {/* My Adventures Section */}
          {!isLoadingBooks && books.length > 0 && (
            <div className="bg-gradient-to-br from-[#EDF1F3] to-white border-2 rounded-xl p-4 md:p-5 mb-4 md:mb-5 shadow-lg" style={{ borderColor: 'var(--tw-sapphire-blue)' }}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--tw-sapphire-blue)' }}>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="headline text-lg md:text-xl font-bold" style={{ color: 'var(--tw-sapphire-blue)' }}>My Adventures</h3>
              </div>
              <p className="text-gray-700 mb-4 text-sm md:text-base leading-relaxed">
                Continue writing your existing books or start a new one.
              </p>

              {/* Books Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="bg-white border-2 rounded-lg p-4 hover:shadow-lg transition-all group relative"
                    style={{ borderColor: 'var(--tw-wave-blue)' }}
                  >
                    <div onClick={() => router.push(`/book/${book.id}`)} className="cursor-pointer">
                      <h4 className="font-bold mb-2 text-base group-hover:text-[var(--tw-wave-blue)] transition-colors line-clamp-1" style={{ color: 'var(--tw-sapphire-blue)' }}>
                        {book.title}
                      </h4>
                      {book.subtitle && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{book.subtitle}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'}</span>
                        <span>{book.total_word_count.toLocaleString()} words</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center text-xs text-gray-700">
                          <svg className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--tw-wave-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate">{book.game_config.character.name}</span>
                          <span className="mx-2">•</span>
                          <svg className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--tw-wave-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="truncate">{book.game_config.world.name}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(e, book)}
                      className="absolute top-2 right-2 p-2 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete book"
                    >
                      <svg className="w-4 h-4" style={{ color: 'var(--tw-flamingo-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleExportBook(e, book)}
                      disabled={exportingBookId === book.id}
                      className="absolute bottom-2 right-2 p-2 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Export to PDF"
                    >
                      {exportingBookId === book.id ? (
                        <svg className="w-4 h-4 animate-spin" style={{ color: 'var(--tw-wave-blue)' }} fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" style={{ color: 'var(--tw-wave-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End-to-End Journey */}
          <div className="bg-gradient-to-br from-[#EDF1F3] to-white border-2 rounded-xl p-4 md:p-5 mb-4 md:mb-5 shadow-lg" style={{ borderColor: 'var(--tw-sapphire-blue)' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--tw-sapphire-blue)' }}>
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="headline text-lg md:text-xl font-bold" style={{ color: 'var(--tw-sapphire-blue)' }}>End to End Journey</h3>
            </div>
            <p className="text-gray-700 mb-4 text-sm md:text-base leading-relaxed">
              To experience the full end-to-end system, you must complete every step in sequence. Each stage builds upon the previous one, creating your unique story.
            </p>

            {/* Journey Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 text-center hover:shadow-lg transition-all group" style={{ borderColor: 'var(--tw-wave-blue)' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-sm md:text-base font-bold group-hover:scale-110 transition-transform text-white" style={{ backgroundColor: 'var(--tw-wave-blue)' }}>
                  1
                </div>
                <h4 className="font-semibold mb-1 text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  Onboarding
                </h4>
                <p className="text-xs text-gray-600">Choose world & setup</p>
              </div>

              <div className="bg-white border-2 rounded-lg p-3 md:p-4 text-center hover:shadow-lg transition-all group" style={{ borderColor: 'var(--tw-jade-green)' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-sm md:text-base font-bold group-hover:scale-110 transition-transform text-white" style={{ backgroundColor: 'var(--tw-jade-green)' }}>
                  2
                </div>
                <h4 className="font-semibold mb-1 text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  Prologue
                </h4>
                <p className="text-xs text-gray-600">AI generates opening</p>
              </div>

              <div className="bg-white border-2 rounded-lg p-3 md:p-4 text-center hover:shadow-lg transition-all group" style={{ borderColor: 'var(--tw-flamingo-pink)' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-sm md:text-base font-bold group-hover:scale-110 transition-transform text-white" style={{ backgroundColor: 'var(--tw-flamingo-pink)' }}>
                  3
                </div>
                <h4 className="font-semibold mb-1 text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  Gameplay
                </h4>
                <p className="text-xs text-gray-600">Interactive gameplay</p>
              </div>

              <div className="bg-white border-2 rounded-lg p-3 md:p-4 text-center hover:shadow-lg transition-all group" style={{ borderColor: 'var(--tw-amethyst-purple)' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-sm md:text-base font-bold group-hover:scale-110 transition-transform text-white" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}>
                  4
                </div>
                <h4 className="font-semibold mb-1 text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  Authoring
                </h4>
                <p className="text-xs text-gray-600">Compile & edit</p>
              </div>

              <div className="bg-white border-2 rounded-lg p-3 md:p-4 text-center hover:shadow-lg transition-all group" style={{ borderColor: 'var(--tw-turmeric-yellow)' }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-sm md:text-base font-bold group-hover:scale-110 transition-transform text-white" style={{ backgroundColor: 'var(--tw-turmeric-yellow)' }}>
                  5
                </div>
                <h4 className="font-semibold mb-1 text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                  Export
                </h4>
                <p className="text-xs text-gray-600">Export to PDF</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 md:pt-5 border-t-2" style={{ borderColor: 'var(--tw-mist-gray)' }}>
            <div className="flex justify-center items-center text-xs text-gray-500">
              <span className="mr-2">Powered by</span>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Thoughtworks_logo.png/1200px-Thoughtworks_logo.png"
                alt="Thoughtworks Logo"
                className="h-5 opacity-60"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" style={{ border: '2px solid var(--tw-sapphire-blue)' }}>
            <h3 className="text-2xl font-bold headline mb-4" style={{ color: 'var(--tw-sapphire-blue)' }}>
              Delete Book?
            </h3>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete <span className="font-bold">"{bookToDelete.title}"</span>?
            </p>
            <p className="text-gray-600 text-sm mb-6">
              This will permanently delete the book and all its chapters ({bookToDelete.chapters.length} {bookToDelete.chapters.length === 1 ? 'chapter' : 'chapters'}, {bookToDelete.total_word_count.toLocaleString()} words). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-white border-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--tw-sapphire-blue)', color: 'var(--tw-sapphire-blue)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--tw-flamingo-pink)' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
