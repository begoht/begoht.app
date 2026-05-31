let cleanups = [];

export function setCleanup(fn) {
  if (typeof fn === "function") {
    cleanups.push(fn);
  }
}

export function runCleanup() {
  cleanups.forEach(fn => {
    try { fn(); } catch(e) {}
  });
  cleanups = [];
}