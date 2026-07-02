chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-rtl") {
    chrome.storage.local.get(["rtlEnabled"], (result) => {
      const newState = !result.rtlEnabled;
      chrome.storage.local.set({ rtlEnabled: newState });
    });
  }
});
