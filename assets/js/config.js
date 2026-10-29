/* VELIX site config.
   aiEnabled: turn on the Claude assistant once /api/chat is deployed.
   apiBase:   where /api/chat lives. Leave '' when the API runs on the same
              host as the site (e.g. local server, or the whole site on Vercel).
              If the site stays on GitHub Pages and the API is on Vercel, put
              the Vercel URL here, e.g. 'https://velix-api.vercel.app'. */
window.VELIX_CONFIG = (function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  return {
    aiEnabled: local,      // ← set to true after deploying the API
    apiBase: '',           // ← e.g. 'https://velix-api.vercel.app'
    projectsDone: 79       // ← total projects delivered since we started (shown as 79+)
  };
})();
