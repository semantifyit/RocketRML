const xpath = require('xpath');
const helper = require('./helper.js');

class XMLParser {
  constructor(inputPath, iterator, options) {
    this.iterator = iterator;
    this.doc = helper.readFileXML(inputPath, options);
    this.docArray = xpath.select(iterator, this.doc);
  }

  getCount() {
    return this.docArray.length;
  }

  getData(index, path) {
    // make the xpath query
    const object = this.docArray[index];
    const temp = xpath.select(path, object);
    const arr = [];
    temp.forEach((n) => {
      if (n.nodeValue) {
        arr.push(n.nodeValue);
      } else {
        const children = n.childNodes;
        if (children) {
          for (let i = 0; i < children.length; i++) {
            const c = children[i];
            if (c.data) {
              arr.push(c.data);
            }
          }
        }
      }
    });
    return arr;
  }
}

module.exports = XMLParser;
