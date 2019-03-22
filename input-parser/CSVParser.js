const helper = require('./helper.js');

class CsvParser {
    constructor(inputPath, iterator, options) {
        this.iterator = iterator;
        let string  = helper.readFileCSV(inputPath, options);
        let [header, ...lines] = string.trim().split('\n');
        header=header.replace(/(\n|\r)+$/, '');
        let cleanedLines = [];
        for (let l of lines) {
            cleanedLines.push(l.replace(/(\n|\r)+$/, ''));
        }
        this.lines = cleanedLines;
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