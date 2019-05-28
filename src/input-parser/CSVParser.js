const helper = require('./helper.js');

class CsvParser {
  constructor(inputPath, iterator, options) {
    this.iterator = iterator;
    const string = helper.readFileCSV(inputPath, options);
    const [header, ...lines] = string.trim().split(/\r?\n/);
    this.lines = lines;
    this.header = header.split(',');
  }

  getCount() {
    return this.lines.length;
  }

  getData(index, selector) {
    const pos = this.header.indexOf(selector);
    let result = this.lines[index].split(',')[pos];
    if (result === undefined) {
      result = [];
    }
    return result;
  }
}

module.exports = CsvParser;
