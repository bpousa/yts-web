// Content script for YouTube video detection

// Get video info from current page
function getVideoInfo() {
  const url = window.location.href;

  // Extract video ID from URL
  let videoId = null;
  try {
    const urlObj = new URL(url);
    videoId = urlObj.searchParams.get('v');
  } catch (e) {
    return null;
  }

  if (!videoId) return null;

  // Get video title
  const title = getVideoTitle();

  return {
    videoId,
    title,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  };
}

// Try multiple selectors to get video title
function getVideoTitle() {
  // Primary selector (new YouTube layout)
  const primaryTitle = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string');
  if (primaryTitle?.textContent) {
    return primaryTitle.textContent.trim();
  }

  // Alternative selector
  const altTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
  if (altTitle?.textContent) {
    return altTitle.textContent.trim();
  }

  // Fallback to page title
  const pageTitle = document.title;
  if (pageTitle) {
    return pageTitle.replace(' - YouTube', '').trim();
  }

  return 'Unknown Title';
}

// Extract video ID from a YouTube URL
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);

    // Standard watch URL
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // Short URL (youtu.be)
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
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

// Get video info from a thumbnail/link element
function getVideoInfoFromElement(element) {
  // Find the closest anchor with a video link
  const anchor = element.closest('a[href*="/watch"], a[href*="/shorts/"]');
  if (!anchor) return null;

  const videoId = extractVideoId(anchor.href);
  if (!videoId) return null;

  // Try to get title from various possible locations
  let title = 'Unknown Title';

  // Check for title in aria-label
  if (anchor.getAttribute('aria-label')) {
    title = anchor.getAttribute('aria-label');
  }

  // Check for title element nearby
  const titleEl = anchor.querySelector('#video-title, .title, [id*="title"]');
  if (titleEl?.textContent) {
    title = titleEl.textContent.trim();
  }

  // Check parent container for title
  const container = anchor.closest('ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer');
  if (container) {
    const containerTitle = container.querySelector('#video-title');
    if (containerTitle?.textContent) {
      title = containerTitle.textContent.trim();
    }
  }

  return {
    videoId,
    title,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getVideoInfo') {
    const info = getVideoInfo();
    sendResponse(info);
  }

  if (message.action === 'getVideoFromUrl') {
    const videoId = extractVideoId(message.url);
    if (videoId) {
      sendResponse({
        videoId,
        title: 'Video', // Will be updated by background if needed
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      });
    } else {
      sendResponse(null);
    }
  }

  return true;
});

// Notify background script that content script is loaded
chrome.runtime.sendMessage({ action: 'contentScriptReady' });
