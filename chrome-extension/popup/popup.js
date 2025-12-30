// Constants
const MAX_QUEUE_SIZE = 3;
const APP_URL = 'https://yts.appendment.com';

// State
let currentVideo = null;
let queue = [];
let format = 'linkedin';
let instructions = '';

// DOM Elements
const currentVideoEl = document.getElementById('currentVideo');
const currentThumbnailEl = document.getElementById('currentThumbnail');
const currentTitleEl = document.getElementById('currentTitle');
const noVideoMessageEl = document.getElementById('noVideoMessage');
const addCurrentBtnEl = document.getElementById('addCurrentBtn');
const queueListEl = document.getElementById('queueList');
const queueCountEl = document.getElementById('queueCount');
const emptyQueueMessageEl = document.getElementById('emptyQueueMessage');
const clearAllBtnEl = document.getElementById('clearAllBtn');
const formatSelectEl = document.getElementById('formatSelect');
const instructionsInputEl = document.getElementById('instructionsInput');
const charCountEl = document.getElementById('charCount');
const sendBtnEl = document.getElementById('sendBtn');
const toastEl = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadState();
  await detectCurrentVideo();
  setupEventListeners();
  render();
}

// Storage functions
async function loadState() {
  const result = await chrome.storage.local.get(['queue', 'format', 'instructions']);
  queue = result.queue || [];
  format = result.format || 'linkedin';
  instructions = result.instructions || '';
}

async function saveState() {
  await chrome.storage.local.set({ queue, format, instructions });
}

// Detect current video from active tab
async function detectCurrentVideo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('youtube.com/watch')) {
      currentVideo = null;
      return;
    }

    // Send message to content script to get video info
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });

    if (response?.videoId) {
      currentVideo = {
        videoId: response.videoId,
        title: response.title || 'Unknown Title',
        thumbnail: `https://i.ytimg.com/vi/${response.videoId}/mqdefault.jpg`
      };
    }
  } catch (error) {
    console.log('Could not detect video:', error);
    currentVideo = null;
  }
}

// Event listeners
function setupEventListeners() {
  addCurrentBtnEl.addEventListener('click', addCurrentToQueue);
  clearAllBtnEl.addEventListener('click', clearQueue);
  formatSelectEl.addEventListener('change', handleFormatChange);
  instructionsInputEl.addEventListener('input', handleInstructionsChange);
  sendBtnEl.addEventListener('click', sendToApp);
}

// Queue management
function addCurrentToQueue() {
  if (!currentVideo || queue.length >= MAX_QUEUE_SIZE) return;

  // Check for duplicates
  if (queue.some(v => v.videoId === currentVideo.videoId)) {
    showToast('Video already in queue', 'error');
    return;
  }

  queue.push({
    ...currentVideo,
    addedAt: Date.now()
  });

  saveState();
  render();
  showToast('Added to queue');
}

function removeFromQueue(videoId) {
  queue = queue.filter(v => v.videoId !== videoId);
  saveState();
  render();
}

function clearQueue() {
  queue = [];
  saveState();
  render();
}

// Add video from external source (context menu)
async function addVideoToQueue(videoInfo) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    showToast('Queue is full (max 3)', 'error');
    return false;
  }

  if (queue.some(v => v.videoId === videoInfo.videoId)) {
    showToast('Video already in queue', 'error');
    return false;
  }

  queue.push({
    ...videoInfo,
    addedAt: Date.now()
  });

  await saveState();
  render();
  return true;
}

// Format handling
function handleFormatChange(e) {
  format = e.target.value;
  saveState();
}

// Instructions handling
function handleInstructionsChange(e) {
  instructions = e.target.value;
  charCountEl.textContent = instructions.length;
  saveState();
}

// Send to app
function sendToApp() {
  if (queue.length === 0) return;

  const videoIds = queue.map(v => v.videoId).join(',');
  const params = new URLSearchParams({
    videos: videoIds,
    format: format
  });

  if (instructions.trim()) {
    params.set('instructions', instructions.trim());
  }

  const url = `${APP_URL}/generator?${params.toString()}`;
  chrome.tabs.create({ url });

  // Clear queue after sending
  queue = [];
  saveState();
  window.close();
}

// Render UI
function render() {
  renderCurrentVideo();
  renderQueue();
  renderFormat();
  renderInstructions();
  updateSendButton();
}

function renderCurrentVideo() {
  if (currentVideo) {
    currentVideoEl.style.display = 'flex';
    noVideoMessageEl.style.display = 'none';
    currentThumbnailEl.src = currentVideo.thumbnail;
    currentTitleEl.textContent = currentVideo.title;

    // Disable add button if already in queue or queue full
    const inQueue = queue.some(v => v.videoId === currentVideo.videoId);
    const queueFull = queue.length >= MAX_QUEUE_SIZE;
    addCurrentBtnEl.disabled = inQueue || queueFull;
    addCurrentBtnEl.title = inQueue ? 'Already in queue' : queueFull ? 'Queue is full' : 'Add to queue';
  } else {
    currentVideoEl.style.display = 'none';
    noVideoMessageEl.style.display = 'block';
  }
}

function renderQueue() {
  queueCountEl.textContent = `(${queue.length}/${MAX_QUEUE_SIZE})`;

  if (queue.length === 0) {
    queueListEl.innerHTML = '<p class="placeholder" id="emptyQueueMessage">No videos in queue</p>';
    clearAllBtnEl.style.display = 'none';
    return;
  }

  clearAllBtnEl.style.display = 'block';

  queueListEl.innerHTML = queue.map((video, index) => `
    <div class="video-item" data-video-id="${video.videoId}">
      <img class="thumbnail" src="${video.thumbnail}" alt="Thumbnail">
      <div class="video-info">
        <span class="video-title">${escapeHtml(video.title)}</span>
      </div>
      <button class="btn-icon btn-remove" data-index="${index}" title="Remove">×</button>
    </div>
  `).join('');

  // Add remove event listeners
  queueListEl.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const videoId = e.target.closest('.video-item').dataset.videoId;
      removeFromQueue(videoId);
    });
  });
}

function renderFormat() {
  formatSelectEl.value = format;
}

function renderInstructions() {
  instructionsInputEl.value = instructions;
  charCountEl.textContent = instructions.length;
}

function updateSendButton() {
  sendBtnEl.disabled = queue.length === 0;
  sendBtnEl.textContent = queue.length === 0
    ? 'Send to YTS App →'
    : `Send ${queue.length} video${queue.length > 1 ? 's' : ''} to YTS App →`;
}

// Toast notification
function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type} show`;

  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2500);
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addToQueue') {
    addVideoToQueue(message.video).then(success => {
      sendResponse({ success });
    });
    return true; // Keep channel open for async response
  }
});
