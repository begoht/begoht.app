module.exports = {
  apps: [
    {
      name: "bego-api",
      script: "src/server.js",
      cwd: "/var/www/bego/Back",
      instances: Number(process.env.WEB_CONCURRENCY) || 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        SOCKET_TRANSPORTS: "websocket",
        LOCATION_MIN_INTERVAL_MS: 3000,
        LOCATION_MONGO_SNAPSHOT_ENABLED: "false",
        PUBLIC_API_URL: "https://bego.com.ht",
        API_URL: "https://bego.com.ht"
      },
      max_memory_restart: "512M",
      time: true,
      error_file: "/var/log/bego/error.log",
      out_file: "/var/log/bego/out.log",
      merge_logs: true
    },
    {
      name: "bego-monitor",
      script: "scripts/monitor/production-monitor.js",
      cwd: "/var/www/bego/Back",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        API_URL: "https://bego.com.ht",
        MONITOR_PM2_APPS: "bego-api,bego-monitor",
        MONITOR_INTERVAL_MS: 60000,
        MONITOR_WINDOW_MINUTES: 5,
        MONITOR_PM2_RESTART_THRESHOLD: 3,
        MONITOR_SOCKET_DISCONNECT_THRESHOLD: 80,
        MONITOR_FRONTEND_ERROR_THRESHOLD: 12
      },
      max_memory_restart: "256M",
      time: true,
      error_file: "/var/log/bego/monitor-error.log",
      out_file: "/var/log/bego/monitor-out.log",
      merge_logs: true
    }
  ]
};
