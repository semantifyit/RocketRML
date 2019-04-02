const { XpathWrapper } = require('xpath-iterator');
const helper = require('./helper.js');

class XmlParser {
  constructor(inputPath, iterator, options) {
    const xmlStr = helper.readFileString(inputPath, options);
    this.xpathWrapper = new XpathWrapper(xmlStr, iterator);
  }

  getCount() {
    return this.xpathWrapper.getNumElems();
  }

  getData(index, selector) {
    return this.xpathWrapper.getData(index, selector);
  }
}

module.exports = XmlParser;
