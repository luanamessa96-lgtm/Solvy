(function() {
  var saved = localStorage.getItem('theme');
  var dark = JSON.parse(localStorage.getItem('darkMode') || 'false');
  var theme = saved || (dark ? 'dark' : 'light');
  var map = { 'light': 'free-light', 'dark': 'free-dark' };
  document.documentElement.setAttribute('data-theme', map[theme] || theme);
})();
