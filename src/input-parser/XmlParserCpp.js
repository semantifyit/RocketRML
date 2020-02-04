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
    if (selector.startsWith('PATH~')) {
      throw new Error('PATH~ currently not supported in XML performance mode');
    }
    return this.xpathWrapper.getData(index, selector).filter(d => d !== '');
  }

  free() {
    this.xpathWrapper.free();
  }
}

module.exports = XmlParser;
