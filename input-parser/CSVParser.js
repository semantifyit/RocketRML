class CsvParser {
    constructor(inputPath, iterator, options) {
        const [header, ...lines] = inputStr.trim().split('\n');
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