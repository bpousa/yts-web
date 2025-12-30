/**
 * Service Layer Barrel Export
 * Re-exports all services for easy importing
 */

// Claude API
export {
  generateClaudeResponse,
  generateContent,
  generateClaudeResponseStreaming,
  estimateTokens,
  fitsInContext,
  type ClaudeMessage,
  type ClaudeGenerationOptions,
  type ClaudeResponse,
  type StreamCallbacks,
} from './claude.service'

// Groq Whisper API
export {
  transcribeAudio,
  transcribeFromUrl,
  downloadYouTubeAudio,
  transcribeYouTubeVideo,
  isGroqError,
  formatGroqError,
  type TranscriptionOptions,
  type TranscriptionResult,
  type TranscriptionSegment,
  type AudioDownloadResult,
} from './groq.service'

// Gemini Image API
export {
  generateImages,
  generateSingleImage,
  base64ToBuffer,
  mimeToExtension,
  validateImagePrompt,
  isGeminiError,
  formatGeminiError,
  type ImageGenerationOptions,
  type GeneratedImage,
  type ImageGenerationResult,
} from './gemini.service'

// YouTube Data API
export {
  searchVideos,
  getVideoDetails,
  getMultipleVideoDetails,
  parseDuration,
  formatDuration,
  isYouTubeError,
  formatYouTubeError,
  type YouTubeSearchOptions,
  type YouTubeVideoResult,
  type YouTubeSearchResult,
  type YouTubeVideoDetails,
} from './youtube.service'

// Transcript Service
export {
  fetchTranscript,
  fetchTranscriptsBatch,
  analyzeTranscript,
  type TranscriptResult,
  type FetchTranscriptOptions,
  type BatchTranscriptResult,
  type TranscriptAnalysis,
} from './transcript.service'

// SEO Service
export {
  analyzeSEO,
  generateMetaTags,
  extractKeywords,
  getReadabilityScore,
  suggestReadabilityImprovements,
  scoreContent,
  type SEOAnalysisInput,
  type FullSEOAnalysis,
  type ContentScore,
} from './seo.service'

// Tone Profile Service
export {
  analyzeTone,
  refineTone,
  compareTone,
  getToneProfiles,
  getToneProfileById,
  createToneProfile,
  updateToneProfile,
  deleteToneProfile,
  detectToneQuick,
  type ToneProfile,
  type AnalyzeToneInput,
  type QuickToneAnalysis,
} from './tone.service'

// Webhook Service
export {
  buildPayload,
  buildAuthHeaders,
  executeWebhook,
  getWebhooks,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  logWebhookExecution,
  getWebhookLogs,
  WEBHOOK_TEMPLATES,
  type WebhookAuthType,
  type WebhookHttpMethod,
  type WebhookAuthConfig,
  type WebhookConfig,
  type WebhookLog,
  type WebhookExecutionResult,
  type WebhookTemplateKey,
} from './webhook.service'

// Content Generation Service
export {
  generateFromTranscripts,
  generateFromTranscriptsStreaming,
  generateImageForContent,
  getContentList,
  getContentById,
  deleteContent,
  updateContent,
  type GenerateContentInput,
  type GeneratedContent,
  type GenerateImageInput,
} from './content.service'
