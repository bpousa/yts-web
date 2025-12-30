// Background service worker for YTS Chrome Extension

const MAX_QUEUE_SIZE = 3;

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-yts',
    title: 'Add to YTS Queue',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://www.youtube.com/watch*',
      '*://youtube.com/watch*',
      '*://youtu.be/*',
      '*://www.youtube.com/shorts/*',
      '*://youtube.com/shorts/*'
    ]
  });

  console.log('YTS Extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-yts') {
    const videoId = extractVideoId(info.linkUrl);

    if (!videoId) {
      console.error('Could not extract video ID from URL:', info.linkUrl);
      return;
    }

    // Get current queue
    const { queue = [] } = await chrome.storage.local.get('queue');

    // Check queue size
    if (queue.length >= MAX_QUEUE_SIZE) {
      showNotification('Queue Full', 'Maximum 3 videos allowed. Remove a video first.');
      return;
    }

    // Check for duplicates
    if (queue.some(v => v.videoId === videoId)) {
      showNotification('Duplicate', 'This video is already in the queue.');
      return;
    }

    // Fetch video title from YouTube
    const title = await fetchVideoTitle(videoId);

    // Add to queue
    queue.push({
      videoId,
      title,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      addedAt: Date.now()
    });

    await chrome.storage.local.set({ queue });

    showNotification('Added to Queue', `"${truncate(title, 40)}" added (${queue.length}/${MAX_QUEUE_SIZE})`);
  }
});

// Extract video ID from URL
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);

    // Standard watch URL
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // Short URL (youtu.be)
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }

    // Shorts URL
    if (urlObj.pathname.startsWith('/shorts/')) {
      return urlObj.pathname.split('/')[2];
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Fetch video title from YouTube oEmbed API
async function fetchVideoTitle(videoId) {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (response.ok) {
      const data = await response.json();
      return data.title || 'Unknown Title';
    }
  } catch (e) {
    console.error('Failed to fetch video title:', e);
  }

  return 'Unknown Title';
}

// Show notification
function showNotification(title, message) {
  // Use chrome.notifications if available
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title,
      message
    });
  }
}

// Truncate string
function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

// Listen for content script ready
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script ready on tab:', sender.tab?.id);
  }
});
