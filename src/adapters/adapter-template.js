'use strict';

const isFunction = require('lodash.isfunction');

/*
 * This file is used as boilerplate for new AnagramService adapters 
 * and as an interface definition for JSDocs.
 *
 * An AnagramService adapter provides the minimum storage and querying facilities
 * required by AnagramService and abstracts them from the service logic to 
 * facilitate swapping based on storage-specific features such as performance, 
 * persistence, or replication.
 *
 * It provides semantics for associating a key string to a set of values, 
 * managing the set of values per key, querying for a set by key, 
 * and iterating key/set pairs.
 *
 * IMPLEMENTATION TODO: update description below to "An AnagramService adapter using ..." 
 * that explains pros/cons of specific underlying store
 *
 * IMPLEMENTATION TODO: change @interface tag below to @implements {Adapter}
 *
 */

/**
 * An interface that every AnagramService adapter must implement.
 *
 * @interface
 */
class Adapter { // IMPLEMENTATION TODO: rename Adapter to {{underlying store}}Adapter
    constructor(opts) {

        // IMPLEMENTATION TODO: implement underlying store initialization, using opts if applicable

    }

    /**
     * Get the set of values for a key.
     *
     * @param  {string}          key The key for which to get corresponding values
     * @return {Promise.<array>}     The corresponding set of values.
     *                               Empty array if no match for key.
     */
    get(key) {
        return new Promise((resolve, reject) => {

            // IMPLEMENTATION TODO: implement get and resolve with array of values, falling back to empty array

        });
    }

    /**
     * Add a value to the set of values associated with a key.
     *
     * The set is kept free of duplicates based on strict equality.
     *
     * @param  {string}                key The key for which to add the value
     * @param  {any}                   val The value to add
     * @return {Promise.<SetOpResult>}     Information about the add operation
     */
    add(key, val) {
        return new Promise((resolve, reject) => {

            // IMPLEMENTATION TODO: const values = <GET VALUES FROM STORE>;

            if (!values) {
                // add new set

                // IMPLEMENTATION TODO: set key to [val]

                resolve({ affected: 1, size: 1 });
                return;
            }

            if (!values.includes(val)) { // avoid adding duplicate values
                // add value to existing set
                values.push(val);

                // IMPLEMENTATION TODO: update key with values array

                resolve({ affected: 1, size: values.length });
                return;
            }

            resolve({ affected: 0, size: values.length });
        });
    }

    /**
     * Delete a value from the set of values associated with a key.
     *
     * @param  {string}                key   The key for which to delete the value
     * @param  {(any|function)}        [val] The value to delete or a predicate generator 
     *                                       function that returns (based on the current
     *                                       set of values) a predicate for matching 
     *                                       values to KEEP.
     *                                       If omitted (ie, `undefined` or `null`), 
     *                                       delete full set of values for key.
     * @return {Promise.<SetOpResult>}       Information about the delete operation
     */
    delete(key, val) {
        return new Promise((resolve, reject) => {

            // IMPLEMENTATION TODO: const values = <GET VALUES FROM STORE> || [];

            if (val == null) { // delete full set

                // IMPLEMENTATION TODO: delete key from store

                resolve({ affected: values.length, size: 0 });
                return;
            }

            if (isFunction(val)) { // val is a predicate generator
                const predicate = val(values);

                if (!isFunction(predicate)) {
                    reject('Predicate generator did not return a predicate');
                    return;
                }

                const filteredValues = values.filter(predicate);

                if (!filteredValues.length) { // filtered set is empty

                    // IMPLEMENTATION TODO: delete key from store

                } else {

                    // IMPLEMENTATION TODO: set key to filteredValues

                }

                resolve({ affected: values.length - filteredValues.length, size: filteredValues.length });
                return;
            }

            const idx = values.indexOf(val);

            if (idx > -1) { // val is in the set
                if (values.length === 1) { // set only contains val

                    // IMPLEMENTATION TODO: delete key from store

                    resolve({ affected: 1, size: 0 });
                } else { // set contains val and others
                    values.splice(idx, 1);

                    // IMPLEMENTATION TODO: update key with values array

                    resolve({ affected: 1, size: values.length });
                }

                return;
            }

            resolve({ affected: 0, size: values.length });
        });
    }

    /**
     * Clear store.
     *
     * @return {Promise.<undefined>}
     */
    clear() {
        return new Promise((resolve, reject) => {

            // IMPLEMENTATION TODO: clear store

            resolve();
        });
    }

    /**
     * Call iteratee on each key/set pair in the store.
     *
     * @param  {StoreIteratee}       iteratee A function that receives the set and key of each pair in the store
     * @return {Promise.<undefined>}
     */
    each(iteratee) {
        return new Promise((resolve, reject) => {

            // IMPLEMENTATION TODO: iterate store

            resolve();
        });
    }
}

module.exports = Adapter; // IMPLEMENTATION TODO: rename Adapter to {{underlying store}}Adapter

// IMPLEMENTATION TODO: delete JSDoc comment below

/**
 * @callback StoreIteratee
 * @param {array}  set The set of values for the current key/set pair
 * @param {string} key The key of the current key/set pair
 */

/**
 * @typedef {object} SetOpResult
 * @property {number} affected Number of values in the relevant set that were
 *                             affected (eg, added or deleted) by the operation
 * @property {number} size     Final size of the relevant set after operation
 */
