/**
 * Inline script injected into <head> so we capture the `beforeinstallprompt`
 * event at the earliest possible moment (it can fire before React hydrates).
 * The event is stashed on `window.__bipEvent`; the install UI reads it later.
 */
export const pwaCaptureScript = `(function(){
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    window.__bipEvent = e;
    window.dispatchEvent(new Event('bip-ready'));
  });
  window.addEventListener('appinstalled', function(){
    window.__bipEvent = null;
    window.dispatchEvent(new Event('bip-ready'));
  });
})();`;
