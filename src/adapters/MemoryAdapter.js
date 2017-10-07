'use strict';

const isFunction = require('lodash.isfunction');

/**
 * A simple AnagramService adapter using JavaScript's Map (no persistence).
 *
 * See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map}
 *
 * @implements {Adapter}
 */
class MemoryAdapter {
    constructor() {
        this._map = new Map();
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
            resolve(this._map.get(key) || []);
        });

        // code below used for perf testing against Promise/event loop overhead

        // return {
        //     then: f => f(this._map.get(key) || [])
        // };
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
            const values = this._map.get(key);

            if (!values) {
                // add new set
                this._map.set(key, [val]);
                resolve({ affected: 1, size: 1 });
                return;
            }

            if (!values.includes(val)) { // avoid adding duplicate values
                // add value to existing set
                values.push(val);
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
            const values = this._map.get(key) || [];

            if (val == null) { // delete full set
                this._map.delete(key);
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
                    this._map.delete(key);
                } else {
                    this._map.set(key, filteredValues);
                }

                resolve({ affected: values.length - filteredValues.length, size: filteredValues.length });
                return;
            }

            // mutate the source array

            const idx = values.indexOf(val);

            if (idx > -1) { // val is in the set
                if (values.length === 1) { // set only contains val
                    this._map.delete(key);
                    resolve({ affected: 1, size: 0 });
                } else { // set contains val and others
                    values.splice(idx, 1);
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
            this._map.clear();
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
            this._map.forEach(iteratee);
            resolve();
        });
    }
}

module.exports = MemoryAdapter;
