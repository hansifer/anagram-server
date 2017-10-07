'use strict';

const program = require('commander');

const startServer = require('./server');
const MemoryAdapter = require('./adapters/MemoryAdapter');

program.option('-p, --port <n>', 'A port number', parseInt).parse(process.argv);

startServer({
    adapter: new MemoryAdapter(),
    port: program.port || 3000,
    preload: 'src/config/dictionary.txt' // preload since we're using MemoryAdapter
});
