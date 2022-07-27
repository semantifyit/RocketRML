const helper = require('../input-parser/helper');

// replace prefix (rml:test -> test) id prefix exists
const replacePrefixIfExists = (input, prefixes) => {
  if (input.indexOf(':') !== -1) {
    const p = input.split(':');
    if (p.length !== 2) {
      // too many : in string (only one allowed)
      throw (`replacePrefixIfExists(): Error during processing string: too many ":" in ${input} ! only one allowed.`);
    }
    const prefix = p[0];
    const value = p[1];
    if (!prefixes[prefix]) {
      // prefix not declared
      throw (`replacePrefixIfExists(): Error during processing string: Prefix ${prefix} is not defined`);
    }
    return value;
  }
  return input;
};

// replaces url, if last character in url is /
const replaceUrlIfExists = (input) => {
  let result = input;
  const splits = input.split('/');
  if (splits.length > 1) {
    result = splits[splits.length - 1];
  }
  return result;
};

// replaces url, if last character in url is #
const replaceUrlWithHashIfExists = (input) => {
  let result = input;
  const splits = input.split('#');
  if (splits.length > 1) {
    result = splits[splits.length - 1];
  }
  return result;
};

// remove all prefixes (url and all others)
const checkAndRemovePrefixesFromObject = (object, prefixes) => {
  const result = {};
  Object.keys(object).forEach((key) => {
    const val = object[key];
    key = replaceUrlWithHashIfExists(key);
    key = replaceUrlIfExists(key);
    key = replacePrefixIfExists(key, prefixes);
    result[key] = val;
  });
  return result;
};

// remove all prefixes (url and all others)
const checkAndRemovePrefixesFromString = (string, prefixes) => {
  string = replaceUrlWithHashIfExists(string);
  string = replaceUrlIfExists(string);
  string = replacePrefixIfExists(string, prefixes);
  return string;
};

// removes all prefixes (urls and shortcuts) from object and returns it
const deleteAllPrefixesFromObject = (obj, prefixes) => {
  let result = JSON.stringify(obj, null, 2);
  for (const key in prefixes) {
    if (Object.prototype.hasOwnProperty.call(prefixes, key)) {
      result = result.replace(new RegExp(prefixes[key], 'g'), '');
      result = result.replace(new RegExp(`${key}:`, 'g'), '');
    }
  }
  return JSON.parse(result);
};

const replacePrefixWithURL = (string, prefixes) => {
  if (!string) {
    return undefined;
  }
  if (string['@id']) {
    string = string['@id'];
  }
  if (helper.isURL(string)) {
    return string;
  }
  const stringarr = string.split(':');
  if (stringarr.length > 1) {
    if (prefixes[stringarr[0]]) {
      return string.replace(`${stringarr[0]}:`, prefixes[stringarr[0]]);
    }
    // prefix not in prefixes
    return string;
  }
  // no prefix found
  return string;
};

module.exports = {
  checkAndRemovePrefixesFromObject,
  checkAndRemovePrefixesFromString,
  replacePrefixWithURL,
  deleteAllPrefixesFromObject,
};
