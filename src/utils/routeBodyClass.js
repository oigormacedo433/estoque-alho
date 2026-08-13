function aplicarRotaNoBody() {
  if (typeof document === "undefined") return;
  document.body.dataset.appRoute = window.location.pathname || "/";
}

function iniciarRouteBodyClass() {
  if (typeof window === "undefined") return;

  aplicarRotaNoBody();

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStatePatch() {
    const retorno = originalPushState.apply(this, arguments);
    aplicarRotaNoBody();
    return retorno;
  };

  window.history.replaceState = function replaceStatePatch() {
    const retorno = originalReplaceState.apply(this, arguments);
    aplicarRotaNoBody();
    return retorno;
  };

  window.addEventListener("popstate", aplicarRotaNoBody);
  window.addEventListener("hashchange", aplicarRotaNoBody);

  setInterval(aplicarRotaNoBody, 400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarRouteBodyClass);
} else {
  iniciarRouteBodyClass();
}
