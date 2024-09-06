console.log('AI chat content script loaded');

function pasteTranscript() {
  console.log('pasteTranscript function called');
  chrome.storage.local.get(['aiTranscript'], function (result) {
    if (result.aiTranscript) {
      console.log('Transcript found in storage:', result.aiTranscript.substring(0, 100) + '...');

      let inputElement;

      if (window.location.href.includes('chatgpt.com')) {
        inputElement = document.querySelector('textarea[data-id="root"]');
      } else if (window.location.href.includes('claude.ai/new')) {
        inputElement = document.querySelector('div[contenteditable="true"]');
      }

      if (inputElement) {
        if (window.location.href.includes('chatgpt.com')) {
          // For ChatGPT
          inputElement.value = result.aiTranscript;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          // For Claude
          // Clear existing content
          inputElement.innerHTML = '';
          // Add prompt and transcript with line breaks
          const lines = result.aiTranscript.split('\n');
          lines.forEach((line, index) => {
            const p = document.createElement('p');
            p.textContent = line;
            inputElement.appendChild(p);
            if (index < lines.length - 1) {
              inputElement.appendChild(document.createElement('br'));
            }
          });
          // Trigger input event
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          // Focus the input element
          inputElement.focus();
        }
        console.log('Transcript pasted into input element');

        // Function to find and click send button
        function findAndClickSendButton() {
          let sendButton;
          if (window.location.href.includes('chatgpt.com')) {
            sendButton = document.querySelector('button[data-testid="send-button"]');
          } else if (window.location.href.includes('claude.ai/new')) {
            sendButton = document.querySelector('button[aria-label="Send Message"]');
          }

          if (sendButton) {
            sendButton.click();
            console.log('Send button clicked');
            return true;
          }
          return false;
        }

        // Attempt to click send button multiple times
        let attempts = 0;
        const maxAttempts = 10;
        const attemptInterval = 500; // 0.5 seconds

        function attemptClick() {
          if (attempts < maxAttempts) {
            if (findAndClickSendButton()) {
              console.log('Send button found and clicked');
            } else {
              attempts++;
              setTimeout(attemptClick, attemptInterval);
            }
          } else {
            console.log('Max attempts reached. Send button not found.');
          }
        }

        // Start attempting to find and click the send button
        setTimeout(attemptClick, 500);

        // Clear the storage after use
        chrome.storage.local.remove('aiTranscript', function () {
          console.log('Transcript removed from storage');
        });
      } else {
        console.error('Input element not found');
      }
    } else {
      console.log('No transcript found in storage');
    }
  });
}

// Wait for the page to load before attempting to paste the transcript
window.addEventListener('load', function () {
  console.log('Window load event fired');
  setTimeout(pasteTranscript, 2000); // Wait 2 seconds before trying to paste
});
