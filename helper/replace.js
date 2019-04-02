/* eslint-disable no-nested-ternary */

const isReplaceable = (obj) => {
  const entries = Object.entries(obj);
  return (
    entries.length === 1
     && ((entries[0][0] === '@id'))
  );
};

let todelete = [];
let o;
const replaceBlankNodes = (obj, allNodes) => (obj && typeof obj === 'object'
  ? isReplaceable(obj)
    ? (o = allNodes.find(e => e['@id'] === obj['@id']), p = replaceBlankNodes(o, allNodes), todelete.push(obj['@id']), p)
    : Object.entries(obj).reduce(
      (acc, [k, v]) => {
        if (typeof v === 'object') {
          acc[k] = replaceBlankNodes(v, allNodes);
        } else {
          acc[k] = v;
        }
        return acc;
      },
      Array.isArray(obj) ? [] : {},
    )
  : obj);

const replace = (input) => {
  todelete = [];
  const temp = replaceBlankNodes(input, input);
  const result = [];
  temp.forEach((d) => {
    if (todelete.indexOf(d['@id']) === -1) {
      result.push(d);
    }
  });
  return result;
};


module.exports.replace = replace;
