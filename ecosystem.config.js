module.exports = {
  apps: [
    {
      name: "forest-web",
      cwd: "./apps/web",
      script: "node_modules/.bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 1996,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
    {
      name: "forest-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      env: {
        NODE_ENV: "production",
        PORT: 5051,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
