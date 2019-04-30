const helper = require('../input-parser/helper.js');

const findIdinObjArr = (objArr, id) => {
  let obj = null;
  objArr.forEach((o) => {
    if (o['@id'] === id) {
      obj = o;
    }
  });
  return obj;
};

const removeEmpty = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === 'object') removeEmpty(obj[key]);
    else if (obj[key] == null) delete obj[key];
  });
};

const removeMeta = (obj) => {
  const result = [];
  Object.keys(obj).forEach((key) => {
    const temp = helper.addArray(obj[key]);
    for (const t of temp) {
      removeMetaOnObject(t);
      result.push(t);
    }
  });
  return result;
};

const removeMetaOnObject = (t) => {
  if (t.$parentTriplesMap) {
    delete t.$parentTriplesMap;
  }
  if (t.$parentPaths) {
    delete t.$parentPaths;
  }
};


const convertType = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (key === 'rdf:type' || key === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      const type = obj[key];
      delete obj[key];
      obj['@type'] = type;
    } else if (obj[key] && typeof obj[key] === 'object') {
      convertType(obj[key]);
    } 
  });
};

module.exports.findIdinObjArr = findIdinObjArr;
module.exports.removeEmpty = removeEmpty;
module.exports.removeMeta = removeMeta;
module.exports.convertType = convertType;
