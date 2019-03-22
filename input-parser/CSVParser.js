const helper = require('./helper.js');

class CsvParser {
    constructor(inputPath, iterator, options) {
        this.iterator = iterator;
        let string  = helper.readFileCSV(inputPath, options);
        let [header, ...lines] = string.trim().split(/\r?\n/);
        this.lines = lines;
        this.header = header.split(',');
    }

    getCount(){
        return this.lines.length;
    }

    getData(index, selector) {
        const pos = this.header.indexOf(selector);
        return this.lines[index].split(',')[pos];
    }
}

module.exports = CsvParser;