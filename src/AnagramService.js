'use strict';

const fs = require('fs');
const readline = require('readline');
const isString = require('lodash.isstring');

const util = require('./util/util');

/**
 * An anagram dictionary service for storing and querying anagrams.
 */
class AnagramService {
    /**
     * Initialize the anagram dictionary service.
     *
     * @param {Adapter} adapter The store adapter to use with this instance of AnagramService
     */
    constructor(adapter) {
        if (!adapter) {
            throw 'Invalid adapter';
        }

        this._adapter = adapter;
        this._wordCount = 0; // total words in dictionary
        this._anagramCount = 0; // total anagrams in dictionary (words with no anagrams do not contribute to this count; a set of n words that comprise the full set of known anagrams for each other contributes n-1 to this count)
    }

    /**
     * Get the number of words currently loaded in the dictionary.
     *
     * @return {number} The number of words currently loaded in the dictionary
     */
    wordCount() {
        return this._wordCount;
    }

    /**
     * Get the number of anagrams currently loaded in the dictionary.
     *
     * Words with no anagrams are not included in this count. A set of n words 
     * that comprise the full set of known anagrams for each other contributes 
     * n-1 to this count.
     *
     * @return {number} The number of anagrams currently loaded in the dictionary
     */
    anagramCount() {
        return this._anagramCount;
    }

    /**
     * Get stats about the words in the dictionary.
     *
     * <pre><code>anagramService.stats().then(stats => console.log(`
     *     words:               ${stats.wordCount.toLocaleString()}
     *     anagrams:            ${stats.anagramCount.toLocaleString()}
     *     min word length:     ${stats.minWordLength.toLocaleString()}
     *     max word length:     ${stats.maxWordLength.toLocaleString()}
     *     median word length:  ${stats.medianWordLength.toLocaleString()}
     *     average word length: ${stats.averageWordLength.toLocaleString()}
     *     min cardinality:     ${stats.minCardinality.toLocaleString()}
     *     max cardinality:     ${stats.maxCardinality.toLocaleString()}
     *     median cardinality:  ${stats.medianCardinality.toLocaleString()}
     *     average cardinality: ${stats.averageCardinality.toLocaleString()}
     * `));
     * 
     * >   words:               235,886
     *     anagrams:            15,210
     *     min word length:     1
     *     max word length:     24
     *     median word length:  4
     *     average word length: 9.569
     *     min cardinality:     2
     *     max cardinality:     9
     *     median cardinality:  2
     *     average cardinality: 2.248</code></pre>
     *
     * @return {Promise.<DictionaryStats>} Some statistics about the words in the dictionary
     */
    stats() {
        return new Promise((resolve, reject) => {
            const wordLengths = [],
                cardinalities = [];

            this._adapter.each(anagramSet => {
                if (anagramSet.length > 1) {
                    cardinalities.push(anagramSet.length);
                }

                anagramSet.forEach(word => wordLengths.push(word.length));
            }).then(() => resolve({
                wordCount: wordLengths.length,
                anagramCount: this._anagramCount,
                minWordLength: util.min(wordLengths),
                maxWordLength: util.max(wordLengths),
                medianWordLength: util.median(wordLengths),
                averageWordLength: util.average(wordLengths),
                minCardinality: util.min(cardinalities),
                maxCardinality: util.max(cardinalities),
                medianCardinality: util.median(cardinalities),
                averageCardinality: util.average(cardinalities),
            }));
        });
    }

    /**
     * Get the set of known anagram sets with a minimun and/or maximum number of words.
     *
     * Does not include sets of one.
     *
     * <pre><code>// log all anagrams with cardinality of 5
     * service.anagramsByCardinality(5, 5).then(console.log);
     *
     * // log all anagrams with cardinality of at least 5
     * service.anagramsByCardinality(5).then(console.log);
     *
     * // log all anagrams with cardinality of at most 5
     * service.anagramsByCardinality(null, 5).then(console.log);</code></pre>
     *
     * @param  {number}          [min] Minimum cardinality of anagram sets to return
     * @param  {number}          [max] Maximum cardinality of anagram sets to return
     * @return {Promise.<array>}       An array of qualifying anagram set arrays
     */
    anagramsByCardinality(min, max) {
        return new Promise((resolve, reject) => {
            min = !min || min < 2 ? 2 : min;

            if (!max) {
                max = Infinity;
            } else if (max < min) {
                max = min;
            }

            const result = [];

            this._adapter.each(anagramSet => {
                const cardinality = anagramSet.length;

                if (min <= cardinality && cardinality <= max) {
                    result.push(anagramSet);
                }
            }).then(() => resolve(result));
        });
    }

    /**
     * Get the set of known anagram sets with maximum number of anagrams.
     *
     * Does not consider sets of one.
     *
     * @return {Promise.<array>} An array of qualifying anagram set arrays
     */
    maxCardinalityAnagrams() {
        return new Promise((resolve, reject) => {
            let result = [],
                maxCardinality = 1;

            this._adapter.each(anagramSet => {
                const cardinality = anagramSet.length;

                if (cardinality < 2) {
                    return;
                }

                if (cardinality > maxCardinality) {
                    result = [anagramSet];
                    maxCardinality = cardinality;
                } else if (cardinality === maxCardinality) {
                    result.push(anagramSet);
                }
            }).then(() => resolve(result));;
        });
    }

    /**
     * Get the set of known anagram sets with a minimun and/or maximum word length.
     *
     * Does not include sets of one.
     *
     * <pre><code>// log all anagrams with word length of 8
     * service.anagramsByLength(8, 8).then(console.log);
     *
     * // log all anagrams with word length of at least 8
     * service.anagramsByLength(8).then(console.log);
     *
     * // log all anagrams with word length of at most 8
     * service.anagramsByLength(null, 8).then(console.log);</code></pre>
     *
     * @param  {number}          [min] Minimum word length of anagram sets to return
     * @param  {number}          [max] Maximum word length of anagram sets to return
     * @return {Promise.<array>}       An array of qualifying anagram set arrays
     */
    anagramsByLength(min, max) {
        return new Promise((resolve, reject) => {
            min = !min || min < 1 ? 1 : min;

            if (!max) {
                max = Infinity;
            } else if (max < min) {
                max = min;
            }

            const result = [];

            this._adapter.each((anagramSet, key) => {
                if (anagramSet.length > 1 && min <= key.length && key.length <= max) {
                    result.push(anagramSet);
                }
            }).then(() => resolve(result));
        });
    }

    /**
     * Get the set of known anagram sets with maximum word length.
     *
     * Does not consider sets of one.
     *
     * @return {Promise.<array>} An array of qualifying anagram set arrays
     */
    maxLengthAnagrams() {
        return new Promise((resolve, reject) => {
            let result = [],
                maxLen = 0;

            this._adapter.each((anagramSet, key) => {
                const len = key.length;

                if (anagramSet.length < 2) {
                    return;
                }

                if (len > maxLen) {
                    result = [anagramSet];
                    maxLen = len;
                } else if (len === maxLen) {
                    result.push(anagramSet);
                }
            }).then(() => resolve(result));;
        });
    }

    /**
     * Determine whether a set of words are all anagrams of each other.
     *
     * Returns `false` if any input word is not in the dictionary.
     *
     * Returns `false` if input is an empty array or an array of size 1 
     * (AnagramService follows the convention that a word is not an anagram of itself).
     *
     * <pre><code>service.areAnagrams(['ared','daer','dear']).then(console.log);
     *
     * > true</code></pre>
     *
     * @param  {array}             arr Array of words to test for anagram affinity
     * @return {Promise.<boolean>}     `true` if supplied words are all known anagrams of each other.
     *                                 `false` otherwise.
     */
    areAnagrams(arr) {
        return new Promise((resolve, reject) => {
            if (!arr || arr.length < 2) {
                resolve(false);
                return;
            }

            // bind the AnagramService method
            const get = this.get.bind(this);

            get(arr[0]).then(anagramSet => {
                if (!anagramSet.length) {
                    resolve(false);
                    return;
                }

                // all supplied words must be in the same anagram set

                for (let i = 1; i < arr.length; i++) {
                    if (!hasWord(anagramSet, arr[i].trim())) {
                        resolve(false);
                        return;
                    }
                }

                resolve(true);
            });
        });
    }

    /**
     * Load a set of words from a text file.
     *
     * Each line in the ingest file may be a single word or multiple whitespace-delimited words.
     *
     * <pre><code>service.load('dictionary.txt').then(counts => 
     *   console.log(`loaded ${counts.word} words, ${counts.anagram} of which are anagrams`));</code></pre>
     *
     * @param  {string}                     source Path to words file
     * @return {Promise.<DictionaryCounts>}        Counts for words added
     */
    load(source) {
        return new Promise((resolve, reject) => {
            // bind the AnagramService method
            const add = this.add.bind(this);

            // track load-level counts

            let wordCount = 0, // total words ingested
                anagramCount = 0; // total anagrams ingested. incremented when a word is added for which an anagram exists in the dictionary.

            const reader = readline.createInterface({
                input: fs.createReadStream(source)
            });

            reader.on('line', ingestLine);
            reader.on('close', concludeIngest); // reader closes on end of input

            function ingestLine(line) {
                line = line.trim();

                if (line) { // not an empty string
                    if (!/\s/.test(line)) { // single word
                        return ingestWord(line);
                    }

                    line.split(/\s+/).forEach(ingestWord);
                }
            }

            function ingestWord(word) {
                // add() increments dictionary-level counts
                add(word).then(countIncrements => {
                    wordCount += countIncrements.word;
                    anagramCount += countIncrements.anagram;
                }).catch(ex => {
                    // may be invalid word
                    console.warn(`>  ${ex}`);
                });
            }

            function concludeIngest() {
                resolve({
                    word: wordCount,
                    anagram: anagramCount
                });
            }
        });
    }

    /**
     * Get anagrams for a word.
     *
     * <pre><code>service.get('ashore').then(anagrams => 
     *   console.log(anagrams.join()));
     *
     * > ahorse,hoarse
     *
     * service.get('ashore', { includeInput: true }).then(anagrams => 
     *   console.log(anagrams.join()));
     *
     * > ahorse,ashore,hoarse
     *
     * service.get('ashore', { includeInput: true, limit: 2 }).then(anagrams => 
     *   console.log(anagrams.join()));
     *
     * > ahorse,ashore</code></pre>
     *
     * @param  {string}          word   Word for which to return anagram results.
     *                                  An unknown word (ie, a word that has not been added to
     *                                  the anagram dictionary) will not match any anagrams.
     * @param  {GetOpts}         [opts] Options for get
     * @return {Promise.<array>}        Matching anagram results for input word
     */
    get(word, opts) {
        return new Promise((resolve, reject) => {
            if (!isValidWord(word)) {
                throw `Input word "${word}" is invalid`;
            }

            word = word.trim();

            this._adapter.get(normalizeWord(word)).then(anagramSet => {
                if (!anagramSet || !hasWord(anagramSet, word)) { // no matches or input is not a known word
                    resolve([]);
                    return;
                }

                if (!opts || !opts.includeInput) {
                    // filter input word from results (default behavior)
                    anagramSet = anagramSet.filter(str => str !== word); // only filter exact match
                    // anagramSet = anagramSet.filter(str => !sameWord(word, str));
                }

                if (opts) {
                    if (opts.excludeProperNouns) {
                        // filter proper nouns from results
                        anagramSet = anagramSet.filter(str => !util.isProperNoun(str) || str === word); // do not filter input word (if included per opts.includeInput)
                    }

                    let limit = +opts.limit;

                    if (limit) {
                        anagramSet = anagramSet.slice(0, limit);
                    }
                }

                resolve(anagramSet);
            });
        });
    }

    /**
     * Add a word to the anagram dictionary.
     *
     * <pre><code>service.add('spoink').then(counts => 
     *   console.log(`added ${counts.word} words, ${counts.anagram} anagrams`));
     *
     * > added 1 words, 0 anagrams
     *
     * service.add('spoink').then(counts => 
     *   console.log(`added ${counts.word} words, ${counts.anagram} anagrams`));
     *
     * > added 0 words, 0 anagrams
     *
     * service.add('poinks').then(counts => 
     *   console.log(`added ${counts.word} words, ${counts.anagram} anagrams`));
     *
     * > added 1 words, 1 anagrams</code></pre>
     *
     * @param  {string}                     word Word to add to the dictionary
     * @return {Promise.<DictionaryCounts>}      Affected count increments
     */
    add(word) {
        return new Promise((resolve, reject) => {
            if (!isValidWord(word)) {
                throw `Input word "${word}" is invalid`;
            }

            word = word.trim();

            this._adapter.add(normalizeWord(word), word).then(result => {
                let wordCountIncrement = 0,
                    anagramCountIncrement = 0;

                if (result.affected) {
                    wordCountIncrement = result.affected;
                    this._wordCount += wordCountIncrement;

                    // if set was empty before add, subtract 1 from affected count since we don't consider the first value of a set when counting anagrams
                    anagramCountIncrement = result.affected - (result.size === result.affected ? 1 : 0);
                    this._anagramCount += anagramCountIncrement;
                }

                resolve({
                    word: wordCountIncrement,
                    anagram: anagramCountIncrement
                });
            });
        });
    }

    /**
     * Delete a word from the dictionary.
     *
     * <pre><code>service.delete('read').then(affected => 
     *   console.log(`deleted ${affected} words`));
     *
     * > deleted 1 words
     *
     * service.delete('read').then(affected => 
     *   console.log(`deleted ${affected} words`));
     *
     * > deleted 0 words
     *
     * service.delete('read', { includeAnagrams: true }).then(affected => 
     *   console.log(`deleted ${affected} words`));
     *
     * > deleted 4 words</code></pre>
     *
     * @param  {string}           word   Word to delete from the anagram dictionary
     * @param  {DeleteOpts}       [opts] Options for delete
     * @return {Promise.<number>}        Number of words deleted
     */
    delete(word, opts) {
        return new Promise((resolve, reject) => {
            if (!isValidWord(word)) {
                throw `Input word "${word}" is invalid`;
            }

            word = word.trim();

            // if we're asked to delete all associated anagrams, then instead of passing word we pass a predicate generator function that returns a predicate that either keeps all anagrams (if word is not in anagram set) or deletes all anagrams (if word IS in anagram set). we do this to deny attempts to delete all anagrams of an UNKNOWN word.

            const cond = opts && opts.includeAnagrams ?
                anagramSet => {
                    const setExcludesWord = !hasWord(anagramSet, word);
                    return word => setExcludesWord;
                } : word;

            this._adapter.delete(normalizeWord(word), cond).then(result => {
                if (result.affected) {
                    this._wordCount -= result.affected;

                    // if we wipe out the set of values, subtract 1 from the affected count since we don't consider the first value of a set when counting anagrams
                    this._anagramCount -= (result.affected - (result.size ? 0 : 1));
                }

                resolve(result.affected);
            });
        });
    }

    /**
     * Clear the dictionary.
     *
     * @return {Promise.<undefined>}
     */
    clear() {
        return new Promise((resolve, reject) => this._adapter.clear().then(() => {
            this._wordCount = this._anagramCount = 0;
            resolve();
        }));
    }
}

module.exports = AnagramService;

// ANAGRAMSERVICE HELPER FUNCTIIONS

/**
 * Generate "normalized" (ie, character-sorted) version of a word. 
 *
 * Used to make keys for anagram sets. 
 *
 * Assume trimmed input.
 *
 * @private
 * @function normalizeWord
 * @param  {string} word Input to normalize
 * @return {string}      Normalized version of word
 */
function normalizeWord(word) {
    return word.toLowerCase().split('').sort().join('');
}

/**
 * Test for valid word as per AnagramService constraints.
 * 
 * Assumes word characters are limited to uppercase/lowercase a-z
 * and hyphen (but may not start or end with a hyphen).
 *
 * TODO: expand support for international characters.
 *
 * @private
 * @function isValidWord
 * @param  {string}  str Word to test for validity
 * @return {boolean}     `true` if `str` is a valid word.
 *                       `false` otherwise.
 */
function isValidWord(str) {
    return isString(str) && /^[A-Za-z]+(-?[A-Za-z]+)*$/.test(str.trim());
}

/**
 * Test whether an array contains a word, allowing matches on 
 * lowercase proper nouns.
 * 
 * @private
 * @function hasWord
 * @param  {array}   arr  Array to test for containment of `word`
 * @param  {string}  word Word to test containment of
 * @return {boolean}      `true` if `arr` contains `word`.
 *                        `false` otherwise.
 */
function hasWord(arr, word) {
    for (let i = 0; i < arr.length; i++) {
        if (sameWord(word, arr[i])) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a word matches a target word, allowing lowercase proper nouns.
 *
 * Word must match target either exactly or by uppercasing the first letter
 * of the word. This rule also applies to each component of a hyphenated word.
 *
 * TODO: consider trimming inputs
 *
 * @private
 * @function sameWord
 * @param  {string}  word   Word to compare to target word
 * @param  {string}  target Target word to match
 * @return {boolean}        `true` if `word` matches `target`.
 *                          `false` otherwise.
 */
function sameWord(word, target) {
    if (word.length !== target.length) {
        return false;
    }

    if (!word.length || word === target) {
        // both are empty strings or strings match exactly
        return true;
    }

    // for hyphenated words, we much check each word component separately

    if (target.includes('-')) {
        if (!word.includes('-')) {
            return false;
        }

        const targetComponents = target.split('-'),
            wordComponents = word.split('-');

        if (targetComponents.length !== wordComponents.length) {
            return false;
        }

        for (let i = 0; i < targetComponents.length; i++) {
            if (!sameWord(wordComponents[i], targetComponents[i])) {
                return false;
            }
        }

        return true;
    }

    return (word[0].toUpperCase() + word.substr(1)) === target;
}

/**
 * @typedef {object} DictionaryCounts
 * @property {number} word    The total number of words in the dictionary
 * @property {number} anagram The total number of anagrams in the dictionary.
 *                            Words with no anagrams do not contribute to this count.
 *                            A set of n words that comprise the full set of known 
 *                            anagrams for each other contributes n-1 to this count.
 */

/**
 * @typedef {object} DictionaryStats
 * @property {number} wordCount          The total number of words in the dictionary
 * @property {number} anagramCount       The total number of anagrams in the dictionary.
 *                                       Words with no anagrams do not contribute to this count.
 *                                       A set of n words that comprise the full set of known 
 *                                       anagrams for each other contributes n-1 to this count.
 * @property {number} minWordLength      Minimum word length in the dictionary
 * @property {number} maxWordLength      Maximum word length in the dictionary
 * @property {number} medianWordLength   Median word length in the dictionary
 * @property {number} averageWordLength  Average word length in the dictionary
 * @property {number} minCardinality     Minimum anagram cardinality in the dictionary
 * @property {number} maxCardinality     Maximum anagram cardinality in the dictionary
 * @property {number} medianCardinality  Median anagram cardinality in the dictionary
 * @property {number} averageCardinality Average anagram cardinality in the dictionary
 */

/**
 * @typedef {object} GetOpts
 * @property {boolean} [includeInput]       If truthy, include input word in results.
 * @property {boolean} [excludeProperNouns] If truthy, exclude proper nouns from results
 * @property {number}  [limit]              Upper bound on number of results to return.
 *                                          Ignored if < 1.
 */

/**
 * @typedef {object} DeleteOpts
 * @property {boolean} [includeAnagrams] If truthy, also delete all anagrams of input word
 */
