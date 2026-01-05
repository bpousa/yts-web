/**
 * Script Parser Service
 * Parses scripts into speaker segments for TTS processing
 */

export interface ScriptSegment {
  speaker: string;
  text: string;
  originalText: string;
  lineNumber: number;
}

export interface ParsedScript {
  mode: 'single' | 'podcast';
  speakers: string[];
  segments: ScriptSegment[];
}

// Number to words conversion for TTS
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  if (num < 0) return 'negative ' + numberToWords(-num);

  let words = '';

  if (num >= 1000000000) {
    words += numberToWords(Math.floor(num / 1000000000)) + ' billion ';
    num %= 1000000000;
  }
  if (num >= 1000000) {
    words += numberToWords(Math.floor(num / 1000000)) + ' million ';
    num %= 1000000;
  }
  if (num >= 1000) {
    words += numberToWords(Math.floor(num / 1000)) + ' thousand ';
    num %= 1000;
  }
  if (num >= 100) {
    words += ONES[Math.floor(num / 100)] + ' hundred ';
    num %= 100;
  }
  if (num >= 20) {
    words += TENS[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    words += ONES[num] + ' ';
  }

  return words.trim();
}

/**
 * Preprocess text for TTS - converts numbers, dollars, percentages to words
 * Preserves [bracket tags] for ElevenLabs Audio Tags
 */
export function preprocessTextForTTS(text: string): string {
  let processed = text;

  // Note: Bracket tags like [chuckling], [laughing], [excited] are preserved
  // and handled natively by the eleven_v3 model as Audio Tags

  // Convert $XXk to dollars (e.g., $200k → two hundred thousand dollars)
  processed = processed.replace(/\$(\d+(?:\.\d+)?)\s*[kK]\b/g, (_, num) => {
    const value = parseFloat(num) * 1000;
    return numberToWords(Math.round(value)) + ' dollars';
  });

  // Convert $XXM to dollars (e.g., $1.5M → one point five million dollars)
  processed = processed.replace(/\$(\d+(?:\.\d+)?)\s*[mM]\b/g, (_, num) => {
    const value = parseFloat(num);
    if (num.includes('.')) {
      const parts = num.split('.');
      return numberToWords(parseInt(parts[0])) + ' point ' +
             parts[1].split('').map((d: string) => ONES[parseInt(d)] || d).join(' ') +
             ' million dollars';
    }
    return numberToWords(value) + ' million dollars';
  });

  // Convert $XXB to dollars (e.g., $50B → fifty billion dollars)
  processed = processed.replace(/\$(\d+(?:\.\d+)?)\s*[bB]\b/g, (_, num) => {
    const value = parseFloat(num);
    if (num.includes('.')) {
      const parts = num.split('.');
      return numberToWords(parseInt(parts[0])) + ' point ' +
             parts[1].split('').map((d: string) => ONES[parseInt(d)] || d).join(' ') +
             ' billion dollars';
    }
    return numberToWords(value) + ' billion dollars';
  });

  // Convert $X,XXX to dollars (e.g., $1,000 → one thousand dollars)
  processed = processed.replace(/\$(\d{1,3}(?:,\d{3})+)(?:\.\d{2})?\b/g, (_, num) => {
    const value = parseInt(num.replace(/,/g, ''));
    return numberToWords(value) + ' dollars';
  });

  // Convert simple $XX or $XXX to dollars (e.g., $50 → fifty dollars)
  processed = processed.replace(/\$(\d+)(?:\.(\d{2}))?\b/g, (_, dollars, cents) => {
    let result = numberToWords(parseInt(dollars)) + ' dollars';
    if (cents && parseInt(cents) > 0) {
      result += ' and ' + numberToWords(parseInt(cents)) + ' cents';
    }
    return result;
  });

  // Convert XXK/XXM standalone numbers (e.g., 10K followers → ten thousand followers)
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*[kK]\b(?!\s*dollars)/g, (_, num) => {
    const value = parseFloat(num) * 1000;
    return numberToWords(Math.round(value));
  });

  processed = processed.replace(/(\d+(?:\.\d+)?)\s*[mM]\b(?!\s*dollars)/g, (_, num) => {
    const value = parseFloat(num);
    if (num.includes('.')) {
      const parts = num.split('.');
      return numberToWords(parseInt(parts[0])) + ' point ' +
             parts[1].split('').map((d: string) => ONES[parseInt(d)] || d).join(' ') + ' million';
    }
    return numberToWords(value) + ' million';
  });

  // Convert percentages (e.g., 50% → fifty percent)
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, num) => {
    if (num.includes('.')) {
      const parts = num.split('.');
      return numberToWords(parseInt(parts[0])) + ' point ' +
             parts[1].split('').map((d: string) => ONES[parseInt(d)] || d).join(' ') + ' percent';
    }
    return numberToWords(parseInt(num)) + ' percent';
  });

  // Remove markdown bold/italic markers (keep content)
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '$1'); // **bold** → bold
  processed = processed.replace(/\*([^*]+)\*/g, '$1');     // *italic* → italic
  processed = processed.replace(/__([^_]+)__/g, '$1');     // __bold__ → bold
  processed = processed.replace(/_([^_]+)_/g, '$1');       // _italic_ → italic

  return processed;
}

/**
 * Detect speaker patterns in a script
 * Supports:
 * - **Speaker Name:** text (markdown)
 * - SPEAKER NAME: text (screenplay)
 * - [Speaker Name]: text (bracketed name)
 */
function detectSpeakerPattern(script: string): RegExp | null {
  // Check for markdown style: **Speaker Name:**
  if (/^\*\*[^*]+\*\*:\s*$/m.test(script)) {
    return /^\*\*([^*]+)\*\*:\s*$/;
  }

  // Check for screenplay style: SPEAKER NAME:
  if (/^[A-Z][A-Z\s\.]+:\s*$/m.test(script)) {
    return /^([A-Z][A-Z\s\.]+):\s*$/;
  }

  // Check for bracketed style: [Speaker Name]:
  if (/^\[[^\]]+\]:\s*$/m.test(script)) {
    return /^\[([^\]]+)\]:\s*$/;
  }

  // Check for simple colon style: Speaker Name:
  if (/^[A-Za-z][A-Za-z\s\.]+:\s*$/m.test(script)) {
    return /^([A-Za-z][A-Za-z\s\.]+):\s*$/;
  }

  return null;
}

/**
 * Parse a script into speaker segments
 */
export function parseScript(script: string): ParsedScript {
  const lines = script.split('\n');
  const segments: ScriptSegment[] = [];
  const speakersSet = new Set<string>();

  const speakerPattern = detectSpeakerPattern(script);

  if (!speakerPattern) {
    // No speaker pattern detected - treat as single narrator
    const fullText = script.trim();
    if (fullText) {
      segments.push({
        speaker: 'Narrator',
        text: fullText,
        originalText: fullText,
        lineNumber: 1,
      });
      speakersSet.add('Narrator');
    }

    return {
      mode: 'single',
      speakers: Array.from(speakersSet),
      segments,
    };
  }

  // Parse with speaker pattern
  let currentSpeaker: string | null = null;
  let currentText: string[] = [];
  let currentLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(speakerPattern);

    if (match) {
      // Save previous segment
      if (currentSpeaker && currentText.length > 0) {
        const text = currentText.join('\n').trim();
        if (text) {
          segments.push({
            speaker: currentSpeaker,
            text,
            originalText: text,
            lineNumber: currentLineNumber,
          });
        }
      }

      // Start new segment
      currentSpeaker = match[1].trim();
      speakersSet.add(currentSpeaker);
      currentText = [];
      currentLineNumber = i + 1;
    } else if (currentSpeaker) {
      // Skip metadata lines
      if (line.startsWith('# ') ||
          line.startsWith('---') ||
          line.match(/^\*\*\[SOUND EFFECT:/i) ||
          line.match(/^\*\*Episode:/i) ||
          line.match(/^\*\*Host:/i) ||
          line.match(/^\*\*Guest:/i)) {
        continue;
      }

      currentText.push(line);
    }
  }

  // Don't forget the last segment
  if (currentSpeaker && currentText.length > 0) {
    const text = currentText.join('\n').trim();
    if (text) {
      segments.push({
        speaker: currentSpeaker,
        text,
        originalText: text,
        lineNumber: currentLineNumber,
      });
    }
  }

  const speakers = Array.from(speakersSet);
  const mode = speakers.length > 1 ? 'podcast' : 'single';

  return {
    mode,
    speakers,
    segments,
  };
}

/**
 * Apply preprocessing to all segments
 */
export function preprocessSegments(segments: ScriptSegment[]): ScriptSegment[] {
  return segments.map(segment => ({
    ...segment,
    text: preprocessTextForTTS(segment.text),
  }));
}

/**
 * Estimate audio duration based on word count
 * Average speaking rate: ~150 words per minute
 */
export function estimateDuration(segments: ScriptSegment[]): number {
  const totalWords = segments.reduce((sum, s) => {
    return sum + s.text.split(/\s+/).length;
  }, 0);

  // ~150 words per minute = 2.5 words per second
  return Math.ceil(totalWords / 2.5);
}

/**
 * Format duration in mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
