// Blazor explicit boot with diagnostics and loader control
(function () {
  function showError(msg) {
    try {
      var errorDiv = document.getElementById('error-message');
      if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.innerText = msg;
      }
      var spinner = document.getElementById('loading-spinner');
      if (spinner) spinner.style.display = 'none';
    } catch {}
  }

  function hideLoader() {
    try {
      var spinner = document.getElementById('loading-spinner');
      if (spinner) spinner.style.display = 'none';
      var text = document.getElementById('loading-text');
      if (text) text.style.display = 'none';
    } catch {}
  }

  var started = false;
  // Fallback if Blazor runtime never appears
  setTimeout(function () {
    if (!started && !(window.Blazor && typeof window.Blazor.start === 'function')) {
      showError('Blazor runtime did not load. Check _framework files and CSP.');
    }
  }, 3000);

  // Start when runtime is available
  function tryStart() {
    if (window.Blazor && typeof window.Blazor.start === 'function') {
      window.Blazor.start().then(function () {
        started = true;
        hideLoader();
      }).catch(function (err) {
        showError('Blazor startup failed: ' + (err && err.message ? err.message : String(err)));
      });
    } else {
      // Retry shortly in case script is still parsing
      setTimeout(tryStart, 100);
    }
  }

  tryStart();
})(); 
