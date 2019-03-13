const prefixhelper = require('../helper/prefixHelper.js');
// parses the logicalSource with the whole data, prefixes, and the id of the logicalsource
// returns the file, the type, iterator and referenceFormulation


const parseLogicalSource = (data, prefixes, id) => {
  const entry = data.find(x => x['@id'] === id);
  if (!entry) {
    // logicalsource not found by id
    throw (`parseLogicalSource(): Error during processing logicalsource: could not find id: ${id}`);
  }
  const entryWithoutPrefixes = prefixhelper.checkAndRemovePrefixesFromObject(entry, prefixes);
  const source = entryWithoutPrefixes.source;
  const iterator = entryWithoutPrefixes.iterator;
  let referenceFormulation = entryWithoutPrefixes.referenceFormulation;
  if (source && iterator && referenceFormulation) {
    switch (typeof referenceFormulation) {
      case 'string':
        referenceFormulation = prefixhelper.checkAndRemovePrefixesFromString(referenceFormulation, prefixes);
        break;
      case 'object':
        referenceFormulation = referenceFormulation['@id'];
        if (referenceFormulation) {
          referenceFormulation = prefixhelper.checkAndRemovePrefixesFromString(referenceFormulation, prefixes);
        } else {
          throw ('parseLogicalSource(): Error during processing logicalsource: referenceFormulation has no @id field');
        }
        break;
      default:
        throw ('parseLogicalSource(): Error during processing logicalsource: referenceFormulation in wrong format');
    }

    return {
      source,
      referenceFormulation,
      iterator,
    };
  }
  // not all required entries for logicalsource existing
  throw ('parseLogicalSource(): Error during processing logicalsource: could not find either source, iterator or referenceFormulation');
};

module.exports.parseLogicalSource = parseLogicalSource;
