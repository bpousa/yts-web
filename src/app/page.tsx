import Link from 'next/link'
import {
  FileText,
  Sparkles,
  Search,
  ArrowRight,
  Mic,
  Settings,
  Webhook,
  Youtube,
  PenTool,
  Headphones,
  CheckCircle2
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">YTS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Content Repurposing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Turn YouTube Videos Into<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Podcasts & Articles
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Extract transcripts, generate blog posts, create AI podcasts with custom voices,
            and automate your content workflow — all from YouTube videos.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-xl mx-auto">
            From YouTube video to published content in four simple steps
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Find Videos',
                description: 'Search YouTube or paste URLs to find videos you want to repurpose',
                icon: Search,
                color: 'blue'
              },
              {
                step: '2',
                title: 'Get Transcripts',
                description: 'Automatically extract transcripts with AI fallback for accuracy',
                icon: FileText,
                color: 'green'
              },
              {
                step: '3',
                title: 'Generate Content',
                description: 'Create blog posts, social content, or AI podcast scripts',
                icon: PenTool,
                color: 'purple'
              },
              {
                step: '4',
                title: 'Publish',
                description: 'Export or auto-publish via webhooks to your platforms',
                icon: CheckCircle2,
                color: 'orange'
              }
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-full">
                  <div className={`w-10 h-10 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/50 flex items-center justify-center mb-4 text-${item.color}-600 dark:text-${item.color}-400 font-bold`}>
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {item.description}
                  </p>
                </div>
                {item.step !== '4' && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-300 dark:text-gray-600">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-xl mx-auto">
            A complete toolkit for repurposing video content into multiple formats
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Search}
              title="Video Search"
              description="Search YouTube with filters for duration, date, and view count. Queue multiple videos at once."
              color="blue"
              href="/search"
            />
            <FeatureCard
              icon={FileText}
              title="Transcript Library"
              description="Fetch and store transcripts. Uses official captions with AI transcription as fallback."
              color="green"
              href="/transcripts"
            />
            <FeatureCard
              icon={Sparkles}
              title="Content Generator"
              description="Transform transcripts into blog posts, LinkedIn content, newsletters, and more with AI."
              color="purple"
              href="/generator"
            />
            <FeatureCard
              icon={Headphones}
              title="AI Podcasts"
              description="Generate two-host podcast scripts and synthesize audio with premium AI voices."
              color="pink"
              href="/podcast"
            />
            <FeatureCard
              icon={Mic}
              title="Voice Studio"
              description="Choose from 100+ voices or design custom voices. Set pronunciation rules for perfect TTS."
              color="orange"
              href="/settings"
            />
            <FeatureCard
              icon={Webhook}
              title="Webhooks"
              description="Automate publishing to WordPress, Notion, or any platform with custom webhooks."
              color="cyan"
              href="/webhooks"
            />
          </div>
        </div>

        {/* Podcast Feature Highlight */}
        <div className="mb-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Headphones className="w-6 h-6" />
              <span className="font-semibold">AI Podcast Generation</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Turn Any Video Into a Professional Podcast
            </h3>
            <p className="text-purple-100 mb-6">
              Our AI analyzes your transcripts and creates engaging two-host podcast conversations.
              Choose from premium ElevenLabs voices, customize pronunciation, and download
              broadcast-ready audio files.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                'Natural conversational flow with two distinct hosts',
                '100+ premium AI voices with emotion support',
                'Custom pronunciation rules for names and terms',
                'Automatic script generation from any transcript'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-200" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 hover:bg-purple-50 font-semibold rounded-xl transition-colors"
            >
              Try Podcast Generation
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Repurpose Your Content?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            Start transforming YouTube videos into blog posts, podcasts, and social content today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Youtube className="w-3 h-3 text-white" />
              </div>
              <span>YTS - YouTube Transcript Studio</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-gray-900 dark:hover:text-white">Login</Link>
              <Link href="/signup" className="hover:text-gray-900 dark:hover:text-white">Sign Up</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  href
}: {
  icon: React.ElementType
  title: string
  description: string
  color: string
  href: string
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-400' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-600 dark:text-pink-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-600 dark:text-orange-400' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-600 dark:text-cyan-400' },
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
      <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${colors.text}`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        {description}
      </p>
      <Link
        href={href}
        className={`text-sm font-medium ${colors.text} hover:underline inline-flex items-center gap-1`}
      >
        Learn more <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
