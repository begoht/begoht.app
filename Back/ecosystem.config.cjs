module.exports = {
  apps: [
    {
      name: "bego-api",
      script: "src/server.js",
      cwd: "/var/www/bego/Back",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        PUBLIC_API_URL: "https://bego.com.ht",
        API_URL: "https://bego.com.ht"
      },
      max_memory_restart: "512M",
      time: true,
      error_file: "/var/log/bego/error.log",
      out_file: "/var/log/bego/out.log",
      merge_logs: true
    }
  ]
};
