'use strict';

const INDENT_SPACES = 3;

/**
 * General utility functions.
 *
 * @namespace util
 */
const util = {

    /**
     * Copy a property from a source object to a target object if numeric
     * and coerce to number.
     *
     * @param  {object}    target The object to copy to
     * @param  {object}    source The object to copy from
     * @param  {string}    prop   The name of the property to copy
     * @return {undefined}
     */
    copyPropNumber(target, source, prop) {
        const num = +source[prop];

        if (num || num === 0) {
            target[prop] = num;
        }
    },

    /**
     * Copy a property from a source object to a target object if boolean,
     * 'true', or 'false'. Coerce to boolean.
     *
     * @param  {object}    target The object to copy to
     * @param  {object}    source The object to copy from
     * @param  {string}    prop   The name of the property to copy
     * @return {undefined}
     */
    copyPropBoolean(target, source, prop) {
        const val = source[prop];

        if (val === true || val === 'true') {
            target[prop] = true;
        } else if (val === false || val === 'false') {
            target[prop] = false;
        }
    },

    /**
     * A template literal tag to allow code formatting without sabotaging
     * output indentation.
     *
     * @param  {array}  strs           The literal components of the template literal
     * @param  {array}  interpolations The interpolated components of the template literal
     * @return {string}                The indent-stripped result
     */
    stripIndent(strs, ...interpolations) {
        return strs.reduce((combined, str, i) => combined + str.replace(/\n[\t ]+/gm, '\n') + (interpolations[i] || ''), '');
    },

    /**
     * Pretty-print JSON
     *
     * @param  {any}    obj The item to stringify all pretty like
     * @return {string}     A pretty string representation of `obj`
     */
    formatJSON(obj) {
        return JSON.stringify(obj, null, INDENT_SPACES);
    },

    /**
     * Parse JSON, swallowing exceptions.
     *
     * Returns `undefined` when parse exceptions occur.
     *
     * @param  {string} str The string to parse
     * @return {any}        The parsed item
     */
    silentJSONParse(str) {
        try {
            return JSON.parse(str);
        } catch (ex) {
            // console.warn(ex);
        }
    },

    /**
     * Find the median of some numbers.
     *
     * Returns NaN for empty input array.
     *
     * @param  {array}  arr Array containing numbers
     * @return {number}     Median of numbers in `arr`
     */
    median(arr) {
        arr = arr.slice().sort(); // clone to avoid mutation

        const middleIdx = Math.floor(arr.length / 2);

        if (arr.length % 2) { // odd number of elements, so middle is single element
            return arr[middleIdx];
        }

        // even number of elements, so average the two elements in the middle

        return (arr[middleIdx - 1] + arr[middleIdx]) / 2;
    },

    /**
     * Find the average of some numbers.
     *
     * Returns NaN for empty input array.
     *
     * @param  {array}  arr Array containing numbers
     * @return {number}     Average of numbers in `arr`
     */
    average(arr) {
        return arr.reduce((acc, num) => acc + num, 0) / arr.length;
    },

    /**
     * Find the minimum of some numbers.
     *
     * Returns NaN for empty input array.
     *
     * This function supports large arrays, whereas Math.min
     * may yield max call stack size exceeded exception on V8
     * due to limitation on number of function parms.
     *
     * @param  {array}  arr Array containing numbers
     * @return {number}     Minimum of numbers in `arr`
     */
    min(arr) {
        if (!arr.length) {
            return NaN;
        }

        let result = arr[0];

        for (let i = 1; i < arr.length; i++) {
            if (arr[i] < result) {
                result = arr[i];
            }
        }

        return result;
    },

    /**
     * Find the maximum of some numbers.
     *
     * Returns NaN for empty input array.
     *
     * This function supports large arrays, whereas Math.max
     * may yield max call stack size exceeded exception on V8
     * due to limitation on number of function parms.
     *
     * @param  {array}  arr Array containing numbers
     * @return {number}     Maximum of numbers in `arr`
     */
    max(arr) {
        if (!arr.length) {
            return NaN;
        }

        let result = arr[0];

        for (let i = 1; i < arr.length; i++) {
            if (result < arr[i]) {
                result = arr[i];
            }
        }

        return result;
    },

    /**
     * Determine if a string is a proper noun.
     *
     * Conditions: all letters must be lowercase except for
     * first letter (which must be uppercase) and first letter
     * after a hyphen (which may be uppercase or lowercase). 
     * String may not start or end with a hyphen.
     *
     * Assumes word characters are limited to upper/lower a-z and hyphen.
     *
     * TODO: expand support for international characters.
     *
     * @param  {string}  str String to test for proper nounness
     * @return {boolean}     `true` if `str` is a proper noun.
     *                       `false` otherwise.
     */
    isProperNoun(str) {
        return /^[A-Z]((-[A-Za-z])?[a-z]*)*$/.test(str);
    },

    /**
     * Strip extension (eg, '.json') from end of string, if present.
     *
     * @param  {string}  str String to strip extension from
     * @return {string}      The extension-stripped result
     */
    stripExtension(str) {
        return (str || '').replace(/\.\w+$/, '');
    }

};

module.exports = util;
