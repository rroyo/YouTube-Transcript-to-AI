function checkYouTubeAndUpdateUI() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const isYouTube = tabs[0].url.includes('youtube.com/watch');
    updateButtonState(isYouTube);
    document.getElementById('youtube-warning').style.display = isYouTube ? 'none' : 'block';
  });
}

function updateButtonState(isYouTube) {
  const promptSelect = document.getElementById('prompt-select');
  const promptSelected = promptSelect.value !== '';
  const isCreateNewPrompt = promptSelect.value === '';

  document.getElementById('chatgpt-btn').disabled = !isYouTube || !promptSelected;
  document.getElementById('claude-btn').disabled = !isYouTube || !promptSelected;
  document.getElementById('make-default-btn').disabled = isCreateNewPrompt;
}

function sendToAI(service) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0].url.includes('youtube.com/watch')) {
      alert('This extension only works on YouTube video pages.');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'getTranscript' }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        alert(
          'Error: ' +
            (chrome.runtime.lastError.message ||
              'Could not establish connection. Please refresh the YouTube page and try again.')
        );
        return;
      }

      if (response && response.transcript) {
        console.log('Transcript received in popup:', response.transcript.substring(0, 100) + '...');

        const promptSelect = document.getElementById('prompt-select');
        const selectedPromptIndex = promptSelect.value;
        chrome.storage.local.get({ prompts: [] }, function (result) {
          let fullText = '';
          if (selectedPromptIndex !== '') {
            const selectedPrompt = result.prompts[selectedPromptIndex];
            fullText = selectedPrompt.text + ':\n\n';
          }
          fullText += '"' + response.transcript + '"';

          // Store the full text in chrome.storage.local
          chrome.storage.local.set({ aiTranscript: fullText }, function () {
            console.log('Transcript stored in chrome.storage.local');
            const url = service === 'chatgpt' ? 'https://chatgpt.com/' : 'https://claude.ai/new';
            chrome.tabs.create({ url: url });
          });
        });
      } else if (response && response.error) {
        alert(
          'Error: ' +
            response.error +
            '\n\nPlease try again. If the problem persists, refresh the YouTube page.'
        );
      } else {
        alert(
          "Error: Unable to get transcript. Please make sure you're on a YouTube video page and try again."
        );
      }
    });
  });
}

function savePrompt() {
  const title = document.getElementById('new-prompt-title').value;
  const text = document.getElementById('new-prompt-text').value;
  if (title && text && !title.includes('*')) {
    chrome.storage.local.get({ prompts: [], defaultPromptIndex: -1 }, function (result) {
      const prompts = result.prompts;
      const existingIndex = prompts.findIndex(p => p.title === title);
      if (existingIndex !== -1) {
        prompts[existingIndex] = { title, text };
      } else {
        prompts.push({ title, text });
      }
      chrome.storage.local.set({ prompts: prompts }, function () {
        updatePromptList();
        document.getElementById('new-prompt-title').value = '';
        document.getElementById('new-prompt-text').value = '';
      });
    });
  } else if (title.includes('*')) {
    alert('Asterisk (*) is not allowed in prompt titles.');
  }
}

function updatePromptList() {
  const select = document.getElementById('prompt-select');
  select.innerHTML = '<option value="" id="create-new-prompt">&lt;Create a new prompt&gt;</option>';
  chrome.storage.local.get({ prompts: [], defaultPromptIndex: -1 }, function (result) {
    result.prompts.forEach((prompt, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = (index === result.defaultPromptIndex ? '* ' : '') + prompt.title;
      select.appendChild(option);
    });
    if (result.defaultPromptIndex !== -1) {
      select.value = result.defaultPromptIndex;
      loadPrompt(); // Load the default prompt
    }
    updateButtonState(true);
  });
}

function loadPrompt() {
  const select = document.getElementById('prompt-select');
  const selectedIndex = select.value;
  if (selectedIndex !== '') {
    chrome.storage.local.get({ prompts: [] }, function (result) {
      const selectedPrompt = result.prompts[selectedIndex];
      if (selectedPrompt) {
        document.getElementById('new-prompt-title').value = selectedPrompt.title;
        document.getElementById('new-prompt-text').value = selectedPrompt.text;
      }
    });
  } else {
    document.getElementById('new-prompt-title').value = '';
    document.getElementById('new-prompt-text').value = '';
  }
  updateButtonState(true);
}

function deletePrompt() {
  const select = document.getElementById('prompt-select');
  const selectedIndex = select.value;
  if (selectedIndex !== '' && confirm('Are you sure you want to delete this prompt?')) {
    chrome.storage.local.get({ prompts: [], defaultPromptIndex: -1 }, function (result) {
      const prompts = result.prompts;
      prompts.splice(selectedIndex, 1);
      let defaultPromptIndex = result.defaultPromptIndex;
      if (defaultPromptIndex == selectedIndex) {
        defaultPromptIndex = -1;
      } else if (defaultPromptIndex > selectedIndex) {
        defaultPromptIndex--;
      }
      chrome.storage.local.set(
        { prompts: prompts, defaultPromptIndex: defaultPromptIndex },
        function () {
          updatePromptList();
          document.getElementById('new-prompt-title').value = '';
          document.getElementById('new-prompt-text').value = '';
        }
      );
    });
  }
}

function makeDefaultPrompt() {
  const select = document.getElementById('prompt-select');
  const selectedIndex = parseInt(select.value);
  if (selectedIndex !== -1) {
    chrome.storage.local.set({ defaultPromptIndex: selectedIndex }, function () {
      updatePromptList();
      // No need to clear the selection, updatePromptList will keep it selected
    });
  }
}

document.getElementById('chatgpt-btn').addEventListener('click', () => sendToAI('chatgpt'));
document.getElementById('claude-btn').addEventListener('click', () => sendToAI('claude'));
document.getElementById('save-prompt').addEventListener('click', savePrompt);
document.getElementById('prompt-select').addEventListener('change', loadPrompt);
document.getElementById('delete-prompt').addEventListener('click', deletePrompt);
document.getElementById('make-default-btn').addEventListener('click', makeDefaultPrompt);

updatePromptList(); // This will now select the default prompt if one exists
checkYouTubeAndUpdateUI();
