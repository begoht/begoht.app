export function initConfiguracion() {

  const darkToggle = document.getElementById("darkMode");
  const simpleToggle = document.getElementById("simpleMode");

  if (!darkToggle || !simpleToggle) return;

  // =======================
  // DARK MODE
  // =======================
  const darkSaved = localStorage.getItem("darkMode") === "true";

  if (darkSaved) {
    document.body.classList.add("dark");
    darkToggle.checked = true;
  }

  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", darkToggle.checked);
  });

  // =======================
  // SIMPLE MODE
  // =======================
  const simpleSaved = localStorage.getItem("simpleMode") === "true";

  simpleToggle.checked = simpleSaved;

  simpleToggle.addEventListener("change", () => {
    localStorage.setItem("simpleMode", simpleToggle.checked);
  });
}