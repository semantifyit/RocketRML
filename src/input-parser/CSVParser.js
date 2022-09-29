const { parse } = require('csv-parse/sync');
const helper = require('./helper');

class CsvParser {
  constructor(inputPath, iterator, options) {
    this.iterator = iterator;
    const string = helper.readFileCSV(inputPath, options);

    const result = parse(string, {
      columns: true,
      skip_empty_lines: true,
        ...options.csv
    });
    this.data = result;
  }

  getCount() {
    return this.data.length;
  }

  getData(index, selector) {
    if (selector.startsWith('PATH~')) {
      return [index.toString()];
    }
    if (this.data[index] && this.data[index][selector]) {
      return helper.addArray(this.data[index][selector]);
    }
    return [];
  }
}

module.exports = CsvParser;
