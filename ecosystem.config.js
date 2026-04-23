module.exports = {
    apps: [
        {
            name: 'forest-web',
            cwd: './apps/web',
            script: 'node_modules/.bin/next',
            args: 'start',
            env: {
                NODE_ENV: 'production',
                PORT: 1996,
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            error_file: '/var/log/pm2/forest-web-error.log',
            out_file: '/var/log/pm2/forest-web-out.log',
        },
        {
            name: 'forest-api',
            cwd: './apps/api',
            script: 'dist/main.js',
            env: {
                NODE_ENV: 'production',
                PORT: 5051,
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            error_file: '/var/log/pm2/forest-api-error.log',
            out_file: '/var/log/pm2/forest-api-out.log',
        },
    ],
};
