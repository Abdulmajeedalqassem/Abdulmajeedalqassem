// Theme toggle with persistence + system preference fallback.
(function () {
  var root = document.documentElement;
  var KEY = "theme";

  function apply(theme) {
    if (theme === "dark" || theme === "light") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  try {
    apply(localStorage.getItem(KEY));
  } catch (e) {}

  function current() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#theme-toggle");
    if (!btn) return;
    var next = current() === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
  });
})();
