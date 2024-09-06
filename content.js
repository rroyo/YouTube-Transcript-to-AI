if (window.location.href.includes('youtube.com')) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in YouTube content script:', request);
    if (request.action === 'getTranscript') {
      getTranscript()
        .then(transcript => sendResponse({ transcript: transcript }))
        .catch(error => sendResponse({ error: error.toString() }));
      return true; // Indicates we'll respond asynchronously
    }
  });

  async function waitForElement(selector, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Element ${selector} not found within ${timeout}ms`);
  }

  async function getTranscript() {
    try {
      // Click the "more" button to expand the description
      const moreButton = await waitForElement('tp-yt-paper-button#expand');
      if (moreButton) moreButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Click the "Show transcript" button
      const showTranscriptButton = await waitForElement('button[aria-label="Show transcript"]');
      if (!showTranscriptButton) {
        throw new Error('Show transcript button not found');
      }
      showTranscriptButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Wait for transcript container
      await waitForElement('#segments-container');

      // Extract the transcript text
      const transcriptElements = document.querySelectorAll(
        '#segments-container yt-formatted-string.segment-text'
      );
      const transcriptText = Array.from(transcriptElements)
        .map(element => element.textContent.trim())
        .join(' ');

      if (transcriptText.length === 0) {
        throw new Error('Extracted transcript is empty');
      }

      // DEBUG: Log the transcript content to the console
      //console.log('DEBUG - Extracted transcript:', transcriptText);

      return transcriptText;
    } catch (error) {
      console.error('Error getting transcript:', error);
      throw error;
    }
  }
} else if (
  window.location.href.includes('chat.openai.com') ||
  window.location.href.includes('claude.ai')
) {
  console.log('Content script running on AI chat page');

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in AI chat content script:', request);
    if (request.action === 'pasteText') {
      pasteText(request.text);
      sendResponse({ success: true });
    }
    return true; // Indicates we'll respond asynchronously
  });

  function pasteText(text) {
    console.log('Attempting to paste text:', text.substring(0, 100) + '...');

    // For ChatGPT
    let textarea = document.querySelector('textarea[data-id="root"]');

    // For Claude (adjust this selector if needed)
    if (!textarea && window.location.href.includes('claude.ai')) {
      textarea = document.querySelector('textarea[placeholder="Enter your message"]');
    }

    if (textarea) {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Attempt to click the send button
      let sendButton;
      if (window.location.href.includes('chat.openai.com')) {
        sendButton = document.querySelector('button[data-testid="send-button"]');
      } else if (window.location.href.includes('claude.ai')) {
        // Adjust this selector for Claude's send button
        sendButton = document.querySelector('button[aria-label="Send message"]');
      }

      if (sendButton) {
        sendButton.click();
        console.log('Send button clicked');
      } else {
        console.error('Send button not found');
      }
    } else {
      console.error('Textarea not found');
    }
  }
}
