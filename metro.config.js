const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Windows per-process file handle limit is low (~512).
// Setting maxWorkers to 1 and disabling the persistent cache prevents
// EMFILE ("too many open files") by serializing file I/O during bundling.
config.maxWorkers = 1;
config.cacheStores = [];   // disable disk cache — avoids opening thousands of cache files

module.exports = config;
