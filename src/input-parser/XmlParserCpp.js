let xpathIterator;
try {
  xpathIterator = require('xpath-iterator');
} catch (e) {
  // not installed
}

const helper = require('./helper.js');

class XmlParser {
  constructor(inputPath, iterator, options) {
    const xmlStr = helper.readFileString(inputPath, options);
    if (!xpathIterator) {
      throw new Error('Xpath-iterator not installed, cannot run with xpathLib:"pugixml"');
    }
    this.xpathWrapper = new xpathIterator.XpathWrapper(xmlStr, iterator);
  }

  getCount() {
    return this.xpathWrapper.getNumElems();
  }

  getData(index, selector) {
    if (selector.startsWith('PATH~')) {
      throw new Error('PATH~ currently not supported in XML performance mode');
    }
    return this.xpathWrapper.getData(index, selector);
  }

  free() {
    this.xpathWrapper.free();
  }
}

module.exports = XmlParser;
