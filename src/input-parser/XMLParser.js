const xpath = require('xpath');
const helper = require('./helper.js');

// adapted from https://stackoverflow.com/a/30227178
function getPathToElem(element) {
  if (!element.parentNode) {
    return '';
  }
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return `${getPathToElem(element.parentNode)}/${element.tagName}[${ix + 1}]`;
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
  return '';
}

class XMLParser {
  constructor(inputPath, iterator, options) {
    const doc = helper.readFileXML(inputPath, options);
    this.docArray = xpath.select(iterator, doc);
  }

  getCount() {
    return this.docArray.length;
  }

  getData(index, path) {
    // make the xpath query
    const object = this.docArray[index];
    const temp = xpath.select(path.replace(/^PATH~/, ''), object);
    const arr = [];
    if (path.startsWith('PATH~') && Array.isArray(temp)) {
      return temp.map(getPathToElem);
    }
    if (typeof temp === 'string') {
      return [temp];
    }
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
