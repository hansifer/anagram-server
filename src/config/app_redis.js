'use strict';

const program = require('commander');

const startServer = require('./server');
const RedisAdapter = require('./adapters/RedisAdapter');

program.option('-p, --port <n>', 'A port number', parseInt).parse(process.argv);

startServer({
    adapter: new RedisAdapter(),
    port: program.port || 3000,
});
