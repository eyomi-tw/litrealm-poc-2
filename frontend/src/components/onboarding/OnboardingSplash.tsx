'use client';

import { useRouter } from 'next/navigation';

export default function OnboardingSplash() {
  const router = useRouter();

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
                Start Creating
              </button>
            </div>
          </div>

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

          {/* Two Column Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
            {/* Working Prototype */}
            <div className="bg-gradient-to-br from-white to-[#EDF1F3] border-2 rounded-xl p-4 md:p-5 shadow-md hover:shadow-xl transition-all" style={{ borderColor: 'rgba(71, 161, 173, 0.3)' }}>
              <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--tw-wave-blue)' }}>
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="headline text-lg md:text-xl font-bold" style={{ color: 'var(--tw-sapphire-blue)' }}>Working Prototype</h3>
              </div>
              <p className="text-gray-700 mb-3 leading-relaxed text-xs md:text-sm">
                Every component you'll interact with is fully functional. This isn't a mockup—it's a complete system ready for testing.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-wave-blue)' }}>•</span>
                  <span>Live database connections</span>
                </li>
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-wave-blue)' }}>•</span>
                  <span>Real AI processing</span>
                </li>
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-wave-blue)' }}>•</span>
                  <span>End-to-end workflows</span>
                </li>
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-wave-blue)' }}>•</span>
                  <span>Actual file generation</span>
                </li>
              </ul>
            </div>

            {/* Intentional Design */}
            <div className="bg-gradient-to-br from-white to-[#EDF1F3] border-2 rounded-xl p-4 md:p-5 shadow-md hover:shadow-xl transition-all" style={{ borderColor: 'rgba(99, 79, 125, 0.3)' }}>
              <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}>
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="headline text-lg md:text-xl font-bold" style={{ color: 'var(--tw-sapphire-blue)' }}>Intentional Design</h3>
              </div>
              <p className="text-gray-700 mb-3 leading-relaxed text-xs md:text-sm">
                The lightweight interface keeps focus on functionality over aesthetics. We're proving the system works before polishing the presentation.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-amethyst-purple)' }}>•</span>
                  <span>Function-first approach</span>
                </li>
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-amethyst-purple)' }}>•</span>
                  <span>Rapid iteration enabled</span>
                </li>
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-amethyst-purple)' }}>•</span>
                  <span>User feedback focused</span>
                </li>
                <li className="flex items-start space-x-2 text-gray-800 text-xs md:text-sm">
                  <span className="mt-1" style={{ color: 'var(--tw-amethyst-purple)' }}>•</span>
                  <span>Performance optimized</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Live AI Agent Architecture */}
          <div className="bg-gradient-to-br from-[#EDF1F3] to-white border-2 rounded-xl p-4 md:p-5 shadow-lg mb-4 md:mb-5" style={{ borderColor: 'var(--tw-sapphire-blue)' }}>
            <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--tw-sapphire-blue)' }}>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="headline text-lg md:text-xl font-bold" style={{ color: 'var(--tw-sapphire-blue)' }}>Live AI Agent Architecture</h3>
            </div>
            <p className="text-gray-700 mb-4 text-sm md:text-base leading-relaxed">
              These agents collaborate in real-time to create seamless storytelling experiences. The unified AI system handles every aspect from compelling openings to polished publishing-ready output.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {/* Prologue Generator Agent */}
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-lg transition-all group" style={{ borderColor: 'rgba(107, 158, 120, 0.3)' }}>
                <div className="flex items-center space-x-2 mb-2 md:mb-3">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full animate-pulse-custom" style={{ backgroundColor: 'var(--tw-jade-green)' }}></div>
                  <h4 className="text-sm md:text-base font-bold transition-colors" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    Prologue Generator
                  </h4>
                </div>
                <p className="text-gray-700 mb-2 md:mb-3 leading-relaxed text-xs md:text-sm">
                  Creates dynamic story openings based on player choices and world parameters
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-jade-green)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Real-time generation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-jade-green)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Context-aware narratives</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-jade-green)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Character integration</span>
                  </div>
                </div>
              </div>

              {/* Story Writer Agent */}
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-lg transition-all group" style={{ borderColor: 'rgba(71, 161, 173, 0.3)' }}>
                <div className="flex items-center space-x-2 mb-2 md:mb-3">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full animate-pulse-custom" style={{ backgroundColor: 'var(--tw-wave-blue)' }}></div>
                  <h4 className="text-sm md:text-base font-bold transition-colors" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    Story Writer
                  </h4>
                </div>
                <p className="text-gray-700 mb-2 md:mb-3 leading-relaxed text-xs md:text-sm">
                  Continuously writes and adapts narrative based on player decisions and outcomes
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-wave-blue)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Dynamic storytelling</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-wave-blue)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Consequence tracking</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-wave-blue)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Emotional continuity</span>
                  </div>
                </div>
              </div>

              {/* Story Compiler Agent */}
              <div className="bg-white border-2 rounded-lg p-3 md:p-4 hover:shadow-lg transition-all group" style={{ borderColor: 'rgba(99, 79, 125, 0.3)' }}>
                <div className="flex items-center space-x-2 mb-2 md:mb-3">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full animate-pulse-custom" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}></div>
                  <h4 className="text-sm md:text-base font-bold transition-colors" style={{ color: 'var(--tw-sapphire-blue)' }}>
                    Story Compiler
                  </h4>
                </div>
                <p className="text-gray-700 mb-2 md:mb-3 leading-relaxed text-xs md:text-sm">
                  Transforms gameplay sessions into publishable, coherent narratives
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-amethyst-purple)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Auto-formatting</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-amethyst-purple)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Multi-format export</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-700">
                    <svg className="w-3 h-3" style={{ color: 'var(--tw-amethyst-purple)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Publishing ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Architecture */}
          <div className="bg-gradient-to-br from-[#EDF1F3] to-white border-2 border-gray-300 rounded-xl p-4 md:p-5 hover:shadow-lg transition-all mb-4 md:mb-5">
            <div className="flex items-start space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gray-700 rounded-lg flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="headline text-base md:text-lg font-bold mb-2" style={{ color: 'var(--tw-sapphire-blue)' }}>Technical Architecture</h4>
                <p className="text-gray-700 mb-3 md:mb-4 leading-relaxed text-xs md:text-sm">
                  Built on proven technologies with custom AI integrations. Every interaction flows through our specialized agent network.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-white rounded-lg p-3 md:p-4 border-2" style={{ borderColor: 'rgba(71, 161, 173, 0.2)' }}>
                    <h5 className="headline font-bold mb-2 md:mb-3 flex items-center text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" style={{ color: 'var(--tw-wave-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                      Core Systems
                    </h5>
                    <ul className="space-y-1.5 md:space-y-2">
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-wave-blue)' }}></div>
                        <span>Real-time AI processing</span>
                      </li>
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-wave-blue)' }}></div>
                        <span>Dynamic content generation</span>
                      </li>
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-wave-blue)' }}></div>
                        <span>Persistent story state</span>
                      </li>
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-wave-blue)' }}></div>
                        <span>Multi-format compilation</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-3 md:p-4 border-2" style={{ borderColor: 'rgba(99, 79, 125, 0.2)' }}>
                    <h5 className="headline font-bold mb-2 md:mb-3 flex items-center text-xs md:text-sm" style={{ color: 'var(--tw-sapphire-blue)' }}>
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" style={{ color: 'var(--tw-amethyst-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Live Capabilities
                    </h5>
                    <ul className="space-y-1.5 md:space-y-2">
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}></div>
                        <span>Character creation & tracking</span>
                      </li>
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}></div>
                        <span>World building & persistence</span>
                      </li>
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}></div>
                        <span>Decision consequence mapping</span>
                      </li>
                      <li className="flex items-center space-x-1.5 text-gray-700 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tw-amethyst-purple)' }}></div>
                        <span>Story export & publishing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="pt-4 md:pt-5 border-t-2" style={{ borderColor: 'var(--tw-mist-gray)' }}>
            <div className="flex justify-center mb-4">
              <button
                onClick={() => router.push('/onboarding/step/1')}
                className="px-10 md:px-12 py-3.5 md:py-4 text-white rounded-lg font-semibold shadow-lg text-base md:text-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{
                  background: 'linear-gradient(to right, var(--tw-sapphire-blue), var(--tw-wave-blue))',
                }}
              >
                Start Creating
              </button>
            </div>
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
    </>
  );
}
