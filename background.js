chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);

  if (request.action === 'processTranscript') {
    console.log('Processing transcript for', request.service);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      console.log('Sending getTranscript message to content script');
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getTranscript' }, function (response) {
        console.log('Received response from content script:', response);

        if (response && response.transcript) {
          console.log('Transcript received, length:', response.transcript.length);

          const url =
            request.service === 'chatgpt' ? 'https://chatgpt.com/' : 'https://claude.ai/chat';

          chrome.tabs.create({ url: url }, function (tab) {
            console.log('New tab created:', tab.id);

            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                console.log('AI page loaded, injecting script');

                chrome.scripting.executeScript(
                  {
                    target: { tabId: tab.id },
                    func: injectTranscript,
                    args: [response.transcript],
                  },
                  () => {
                    if (chrome.runtime.lastError) {
                      console.error('Script injection failed:', chrome.runtime.lastError);
                    } else {
                      console.log('Script injected successfully');
                    }
                  }
                );
              }
            });
          });
        } else {
          console.error('Failed to get transcript');
        }
      });
    });

    sendResponse({ status: 'processing' });
    return true; // Indicates we'll respond asynchronously
  }
});

function injectTranscript(transcript) {
  console.log('Transcript inject function running');
  window.extensionTranscript = transcript;
  console.log('Transcript stored in window.extensionTranscript');

  const textarea = document.querySelector('textarea');
  if (textarea) {
    textarea.value = transcript;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('Transcript pasted into textarea');
  } else {
    console.error('Textarea not found');
  }
}
