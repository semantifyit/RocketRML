const { JSONPath } = require('jsonpath-plus');
const helper = require('./helper.js');

class JsonParser {
  constructor(inputPath, iterator, options) {
    this.iterator = iterator;
    this.json = helper.readFileJSON(inputPath, options);
    this.paths = JSONPath({ path: iterator, json: this.json, resultType: 'path' });
  }

  getCount() {
    return this.paths.length;
  }

  getData(index, selector) {
    return JSONPath({
      path: `${this.paths[index]}.${selector.replace(/^PATH~/, '')}`,
      json: this.json,
      resultType: selector.startsWith('PATH~') ? 'pointer' : 'value',
    })
      .filter((e) => e !== null && e !== undefined) // null values are ignored (undefined shouldn't happens since input is json)
      .map((e) => e.toString()); // return only strings
  }
}

module.exports = JsonParser;
