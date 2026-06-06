// Admin dashboard API/auth helpers.
    async function api(path, options = {}) {
      const token = getToken();
      const res = await fetch(`${API_BASE}${path}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true"
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
      return res.json();
    }

    function getToken() {
      const token = localStorage.getItem("token") || localStorage.getItem("BeGO_token");
      return token?.startsWith("\"") ? token.slice(1, -1) : token;
    }

    function readUser() {
      return safeJson(localStorage.getItem("BeGO_user")) || safeJson(localStorage.getItem("usuario")) || safeJson(localStorage.getItem("user"));
    }

    function safeJson(value) {
      try { return value ? JSON.parse(value) : null; } catch { return null; }
    }

    function logout() {
      ["token", "BeGO_token", "BeGO_user", "usuario", "user"].forEach((key) => localStorage.removeItem(key));
      location.replace("../login.html");
    }
