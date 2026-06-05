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
        SOCKET_TRANSPORTS: "polling,websocket",
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
    }
  ]
};
