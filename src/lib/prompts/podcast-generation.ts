/**
 * Podcast Generation Prompts
 * Converts blog content into two-host conversational podcast scripts
 * Ported from: /mnt/c/Projects/yts/PODCAST_IDEA.md
 */

// ============================================
// HOST PERSONAS
// ============================================

export const HOST_PERSONAS = {
  alex: {
    name: 'Alex',
    role: 'Skeptical Host',
    description: 'Asks clarifying questions, plays devil\'s advocate, represents the audience\'s perspective',
    voiceStyle: 'Thoughtful, curious, occasionally challenging',
    defaultVoice: {
      google: 'en-US-Neural2-D', // Male, conversational
      elevenlabs: 'pNInz6obpgDQGcFmaJgB', // Adam
    },
  },
  jamie: {
    name: 'Jamie',
    role: 'Expert Host',
    description: 'Explains concepts with enthusiasm, provides depth and examples, makes complex ideas accessible',
    voiceStyle: 'Enthusiastic, knowledgeable, engaging storyteller',
    defaultVoice: {
      google: 'en-US-Neural2-F', // Female, conversational
      elevenlabs: 'EXAVITQu4vr4xnSDxMaL', // Bella
    },
  },
} as const

// ============================================
// SCRIPT GENERATION PROMPT
// ============================================

export interface PodcastScriptOptions {
  hostNames?: { host1: string; host2: string }
  hostRoles?: { host1?: string; host2?: string }
  targetDuration?: 'short' | 'medium' | 'long' // 3-5min, 8-12min, 15-20min
  tone?: 'casual' | 'professional' | 'educational'
  focusGuidance?: string
  includeIntro?: boolean
  includeOutro?: boolean
}

// Default host roles (editable by users)
export const DEFAULT_HOST_ROLES = {
  host1: 'Asks clarifying questions, plays devil\'s advocate, represents the audience\'s perspective',
  host2: 'Explains concepts with enthusiasm, provides examples and analogies, makes complex ideas accessible',
}

// V3-compatible emotion tags for ElevenLabs
export const EMOTION_TAGS = [
  'curious', 'excited', 'thoughtful', 'amused', 'serious',
  'enthusiastic', 'cautious', 'cheerful', 'surprised', 'warm',
  'laughing', 'chuckling', 'sigh',
] as const

const DURATION_GUIDELINES = {
  short: {
    wordCount: '600-900 words',
    segments: '4-6 exchanges',
    description: '3-5 minute podcast',
  },
  medium: {
    wordCount: '1500-2200 words',
    segments: '10-15 exchanges',
    description: '8-12 minute podcast',
  },
  long: {
    wordCount: '2800-3800 words',
    segments: '20-30 exchanges',
    description: '15-20 minute podcast',
  },
}

export function buildPodcastScriptPrompt(
  blogContent: string,
  options: PodcastScriptOptions = {}
): string {
  const {
    hostNames = { host1: 'Alex', host2: 'Jamie' },
    hostRoles = DEFAULT_HOST_ROLES,
    targetDuration = 'medium',
    tone = 'casual',
    focusGuidance,
    includeIntro = true,
    includeOutro = true,
  } = options

  const duration = DURATION_GUIDELINES[targetDuration]
  const host1Role = hostRoles.host1 || DEFAULT_HOST_ROLES.host1
  const host2Role = hostRoles.host2 || DEFAULT_HOST_ROLES.host2

  // Build the focus section if provided
  const focusSection = focusGuidance ? `
## EPISODE FOCUS

${focusGuidance}

---
` : ''

  return `You are a podcast script writer. Convert the following blog post into a natural, engaging two-host podcast conversation.

## HOSTS

**${hostNames.host1}**:
- Role: ${host1Role}
- Keep the conversation grounded and relatable

**${hostNames.host2}**:
- Role: ${host2Role}
- Make complex ideas accessible
${focusSection}
## FORMAT REQUIREMENTS

1. Target length: ${duration.wordCount} (${duration.description})
2. Structure: ${duration.segments}
3. Tone: ${tone}
${includeIntro ? '4. Include a brief intro welcoming listeners' : '4. Skip intro - start directly with content'}
${includeOutro ? '5. Include a brief outro with key takeaways' : '5. Skip outro - end naturally'}

## OUTPUT FORMAT

Return the script as a JSON array of dialogue segments:

\`\`\`json
{
  "title": "Episode title based on content",
  "description": "Brief episode description for show notes",
  "segments": [
    {
      "speaker": "${hostNames.host1}",
      "text": "The dialogue for this segment...",
      "emotion": "curious"
    },
    {
      "speaker": "${hostNames.host2}",
      "text": "Response dialogue...",
      "emotion": "enthusiastic"
    }
  ],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}
\`\`\`

## EMOTION OPTIONS (for ElevenLabs V3 voice synthesis)

Use these emotion tags to guide voice delivery:
- curious, excited, thoughtful, amused, serious, enthusiastic
- cautious, cheerful, surprised, warm
- laughing, chuckling (for light moments)

You can also include inline emotion cues in the text like:
- "[laughing] That's hilarious!"
- "[sigh] Well, that's complicated..."
- "Wait, [surprised] really?"

## STYLE GUIDELINES

- Make it sound like a REAL conversation, not a scripted reading
- Include natural reactions: "Oh interesting!", "Hmm...", "Right, right"
- Use contractions and casual language
- Break up long explanations with questions
- Add occasional humor or relatable analogies
- Each segment should be 1-3 sentences (natural speech length)
- Include emotional delivery cues where appropriate

## BLOG CONTENT TO CONVERT

${blogContent}

---

Generate the podcast script now. Return ONLY valid JSON, no markdown code blocks in your response.`
}

// ============================================
// INTRO/OUTRO TEMPLATES
// ============================================

export const INTRO_TEMPLATES = {
  casual: (showName: string, episodeTitle: string, host1: string, host2: string) =>
    `${host1}: Hey everyone, welcome back to ${showName}! I'm ${host1}.
${host2}: And I'm ${host2}! Today we're diving into something really interesting - ${episodeTitle}.
${host1}: Yeah, I've been curious about this one. Let's get into it!`,

  professional: (showName: string, episodeTitle: string, host1: string, host2: string) =>
    `${host1}: Welcome to ${showName}. I'm your host ${host1}, joined as always by ${host2}.
${host2}: Great to be here. Today's topic is ${episodeTitle} - a subject that's been getting a lot of attention lately.
${host1}: Let's break it down.`,

  educational: (showName: string, episodeTitle: string, host1: string, host2: string) =>
    `${host1}: Hello and welcome to ${showName}, the podcast where we make complex topics accessible. I'm ${host1}.
${host2}: And I'm ${host2}. Today we're exploring ${episodeTitle}. By the end of this episode, you'll have a solid understanding of the key concepts.
${host1}: Let's start from the beginning.`,
}

export const OUTRO_TEMPLATES = {
  casual: (host1: string, host2: string) =>
    `${host1}: Alright, that was a lot! What are your main takeaways, ${host2}?
${host2}: I'd say the key things to remember are... [takeaways]. But honestly, just experimenting is the best way to learn.
${host1}: Couldn't agree more. Thanks for listening everyone! See you next time.
${host2}: Bye!`,

  professional: (host1: string, host2: string) =>
    `${host1}: To summarize today's discussion...
${host2}: The main points were [takeaways]. We hope this has been valuable.
${host1}: Thank you for joining us. Until next time.`,

  educational: (host1: string, host2: string) =>
    `${host1}: Let's recap what we learned today.
${host2}: We covered [takeaways]. If you want to dive deeper, check the show notes for resources.
${host1}: Thanks for learning with us. Keep exploring, and we'll see you in the next episode!`,
}

// ============================================
// SCRIPT ENHANCEMENT PROMPT
// ============================================

export function buildScriptEnhancementPrompt(
  script: string,
  feedback: string
): string {
  return `You are a podcast script editor. Improve the following podcast script based on the feedback provided.

## CURRENT SCRIPT
${script}

## FEEDBACK
${feedback}

## INSTRUCTIONS
1. Address the specific feedback
2. Maintain the conversational flow
3. Keep the same hosts and general structure
4. Return the improved script in the same JSON format

Return ONLY valid JSON.`
}

// ============================================
// SEGMENT TIMING ESTIMATION
// ============================================

/**
 * Estimate duration of a text segment in seconds
 * Average speaking rate: 150 words per minute
 */
export function estimateSegmentDuration(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  const wordsPerSecond = 150 / 60 // 2.5 words per second
  return Math.ceil(words / wordsPerSecond)
}

/**
 * Estimate total podcast duration from segments
 */
export function estimateTotalDuration(
  segments: Array<{ text: string }>
): { seconds: number; formatted: string } {
  const totalSeconds = segments.reduce(
    (acc, seg) => acc + estimateSegmentDuration(seg.text),
    0
  )

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return {
    seconds: totalSeconds,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
  }
}
