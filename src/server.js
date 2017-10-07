'use strict';

const restify = require('restify');
const prettyHrtime = require('pretty-hrtime');
const isArray = require('lodash.isarray');
const isString = require('lodash.isstring');

const AnagramService = require('./AnagramService');
const util = require('./util/util');

const DEFAULT_PORT = 3000;

function startServer(opts) {
    if (!opts || !opts.adapter) {
        throw 'No adapter specified';
    }

    // CREATE AND CONFIG REST SERVER

    var server = restify.createServer({ name: 'Anagramarama' });

    server.on('error', function(err) {
        console.error(err);
    });

    server.use(restify.plugins.queryParser());
    server.use(restify.plugins.jsonBodyParser());

    // DEFINE ROUTES

    server.get('/anagrams/:word', respondAnagramsGet);
    server.get('/anagrams', respondAnagramsGet);
    server.get('/words', respondWordsGet);
    server.post('/words.json', respondAdd);
    server.del('/words/:word', respondWordsDelete);
    server.del('/words.json', respondClear);

    // INSTANTIATE SERVICE

    const anagramService = new AnagramService(opts.adapter);

    if (!opts.preload) {
        // no preload required, so start listening for requests right away
        return listen();
    }

    console.log('preloading dictionary...');

    const start = process.hrtime();

    anagramService.load(opts.preload).then(counts => {
        const end = prettyHrtime(process.hrtime(start));

        console.log(`preload took ${end}`);

        logCounts(counts);

        logStats();

        listen();

        function logCounts(counts) {
            console.log(util.stripIndent `
                LOADED:

                words: ${counts.word.toLocaleString()}
                anagrams: ${counts.anagram.toLocaleString()}`);
        }

        function logStats() {
            anagramService.stats().then(stats => console.log(util.stripIndent `
                DICTIONARY STATS:

                words:               ${stats.wordCount.toLocaleString()}
                anagrams:            ${stats.anagramCount.toLocaleString()}
                min word length:     ${stats.minWordLength.toLocaleString()}
                max word length:     ${stats.maxWordLength.toLocaleString()}
                median word length:  ${stats.medianWordLength.toLocaleString()}
                average word length: ${stats.averageWordLength.toLocaleString()}
                min cardinality:     ${stats.minCardinality.toLocaleString()}
                max cardinality:     ${stats.maxCardinality.toLocaleString()}
                median cardinality:  ${stats.medianCardinality.toLocaleString()}
                average cardinality: ${stats.averageCardinality.toLocaleString()}`));
        }
    });

    function listen() {
        server.listen(opts.port || DEFAULT_PORT, () =>
            console.log(util.stripIndent `
                ${server.name} listening at ${server.url}`));
    }

    // SERVER RESPONSE FUNCTIONS

    function respondAnagramsGet(req, res, next) {
        const word = util.stripExtension(req.params.word);

        if (!word) {
            if (req.query.count === 'true') {
                const response = { counts: { anagram: anagramService.anagramCount() } }; // put a bow on it

                console.log(util.stripIndent `
                    ${req.url} => ${util.formatJSON(response)}`);

                res.send(response);
                return next();
            }

            if (req.query.cardinalityMin || req.query.cardinalityMax) {
                anagramService.anagramsByCardinality(+req.query.cardinalityMin, +req.query.cardinalityMax).then(results => {
                    const output = {};

                    util.copyPropNumber(output, req.query, 'cardinalityMin');
                    util.copyPropNumber(output, req.query, 'cardinalityMax');

                    output.anagrams = results;

                    const response = { anagramsByCardinality: output }; // put a bow on it

                    console.log(util.stripIndent `
                        ${req.url} => ${util.formatJSON(response)}`);

                    res.send(response);
                    next();
                });

                return;
            }

            if (req.query.lengthMin || req.query.lengthMax) {
                anagramService.anagramsByLength(+req.query.lengthMin, +req.query.lengthMax).then(results => {
                    const output = {};

                    util.copyPropNumber(output, req.query, 'lengthMin');
                    util.copyPropNumber(output, req.query, 'lengthMax');

                    output.anagrams = results;

                    const response = { anagramsByLength: output }; // put a bow on it

                    console.log(util.stripIndent `
                        ${req.url} => ${util.formatJSON(response)}`);

                    res.send(response);
                    next();
                });

                return;
            }

            if (req.query.maxCardinality === 'true') {
                anagramService.maxCardinalityAnagrams().then(results => {
                    const maxCardinality = results.length ? results[0].length : 0;

                    const response = { maxCardinalityAnagrams: { maxCardinality, anagrams: results } }; // put a bow on it

                    console.log(util.stripIndent `
                        ${req.url} => ${util.formatJSON(response)}`);

                    res.send(response);
                    next();
                });

                return;
            }

            if (req.query.maxLength === 'true') {
                anagramService.maxLengthAnagrams().then(results => {
                    const maxLength = results.length && results[0].length ? results[0][0].length : 0;

                    const response = { maxLengthAnagrams: { maxLength, anagrams: results } }; // put a bow on it

                    console.log(util.stripIndent `
                        ${req.url} => ${util.formatJSON(response)}`);

                    res.send(response);
                    next();
                });

                return;
            }

            if (req.query.areAnagrams) {
                const words = req.query.areAnagrams.split(',');

                if (!words || !words.length) {
                    res.status(400); // Bad Request
                    res.send();
                    return next();
                }

                anagramService.areAnagrams(words).then(result => {
                    const response = { anagramAffinity: { areAnagrams: result, words: words.map(word => word.trim()) } }; // put a bow on it

                    console.log(util.stripIndent `
                        ${req.url} => ${util.formatJSON(response)}`);

                    res.send(response);
                    next();
                });

                return;
            }

            res.status(400); // Bad Request
            res.send();
            return next();
        }

        const start = process.hrtime();

        const opts = {};

        util.copyPropNumber(opts, req.query, 'limit');
        util.copyPropBoolean(opts, req.query, 'excludeProperNouns');
        util.copyPropBoolean(opts, req.query, 'includeInput');

        anagramService.get(word, opts).then(anagramSet => {
            console.log(util.stripIndent `
                Time to find anagrams for "${word}": ${prettyHrtime(process.hrtime(start))}`);

            const response = { anagrams: anagramSet }; // put a bow on it

            console.log(util.stripIndent `
                ${req.url} => ${util.formatJSON(response)}`);

            res.send(response);

            next();
        }).catch(ex => {
            console.log(ex);
            res.status(400); // Bad Request
            res.send({ message: ex });
            next();
        });
    }

    function respondWordsGet(req, res, next) {
        if (req.query.count === 'true') {
            const response = { counts: { word: anagramService.wordCount() } }; // put a bow on it

            console.log(util.stripIndent `
                ${req.url} => ${util.formatJSON(response)}`);

            res.send(response);
            return next();
        }

        if (req.query.stats === 'true') {
            const start = process.hrtime();

            anagramService.stats().then(stats => {
                console.log(util.stripIndent `
                    Time to get stats: ${prettyHrtime(process.hrtime(start))}`);

                const response = { stats }; // put a bow on it

                console.log(util.stripIndent `
                    ${req.url} => ${util.formatJSON(response)}`);

                res.send(response);
                next();
            });

            return;
        }

        res.status(400); // Bad Request
        res.send();
        next();
    }

    function respondAdd(req, res, next) {
        const start = process.hrtime();

        // restify parses JSON only if content-type is application/json

        let words = isString(req.body) ? util.silentJSONParse(req.body) : req.body;

        words = words && words.words; // get at words array

        if (!isArray(words)) {
            res.status(400); // Bad Request
            res.send();
            return next();
        }

        // we have an array of words. call add() on each word and collect returned promises.

        const promises = [];

        words.forEach(word => {
            promises.push(anagramService.add(word));
        });

        // wait for all promises to resolve or reject, ignoring rejected promises

        Promise.all(promises.map(promise => promise.catch(ex => ex))).then(results => {
            let wordsAdded = 0,
                anagramsAdded = 0;

            // take inventory of words that were successfully added

            const successWords = [];

            results.forEach((counts, i) => {
                if (counts.word) { // filter rejected promises and ignored add's
                    wordsAdded += counts.word;
                    anagramsAdded += counts.anagram || 0;
                    successWords.push(words[i]);
                }
            });

            if (wordsAdded) {
                console.log(util.stripIndent `
                    Added ${wordsAdded} words in ${prettyHrtime(process.hrtime(start))}`);

                res.status(201); // Created
                res.send({ counts: { word: wordsAdded, anagram: anagramsAdded }, words: successWords.map(word => `/anagrams/${word}`) });
            } else {
                res.status(204); // No Content
                res.send();
            }

            next();
        }).catch(ex => {
            console.error(ex);
            res.status(500); // Internal Server Error
            res.send({ message: ex });
            next();
        });
    }

    function respondWordsDelete(req, res, next) {
        const word = util.stripExtension(req.params.word);

        if (!word) {
            res.status(400); // Bad Request
            res.send();
            return next();
        }

        const start = process.hrtime();

        const opts = {};

        util.copyPropBoolean(opts, req.query, 'includeAnagrams');

        anagramService.delete(word, opts).then(deleted => {
            if (deleted) {
                console.log(util.stripIndent `
                    Deleted ${deleted} words in ${prettyHrtime(process.hrtime(start))}`);

                res.status(204); // No Content
            } else {
                res.status(404); // Not Found
            }

            res.send();
            next();
        }).catch(ex => {
            console.log(ex);
            res.status(400); // Bad Request
            res.send({ message: ex });
            next();
        });
    }

    function respondClear(req, res, next) {
        const start = process.hrtime();

        anagramService.clear().then(() => {
            console.log(util.stripIndent `
                Cleared dictionary in ${prettyHrtime(process.hrtime(start))}`);

            res.status(204); // No Content
            res.send();
            next();
        }).catch(ex => {
            console.log(ex);
            res.status(500); // Internal Server Error
            res.send({ message: ex });
            next();
        });
    }
}

module.exports = startServer;
