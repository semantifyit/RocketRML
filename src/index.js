const fs = require('fs');
const jsonld = require('jsonld');
const NQuads = require('jsonld/lib/NQuads');
const mapfile = require('./mapfile/mapfileParser');
const logicalSource = require('./input-parser/logicalSourceParser');
const parser = require('./input-parser/parser');
const objectHelper = require('./helper/objectHelper');
const replaceHelper = require('./helper/replace');
const prefixhelper = require('./helper/prefixHelper');
const helper = require('./input-parser/helper');

// jsonld.toRDF writes every literal typed xsd:double in its canonical form, even
// when its value is a string ("33568" becomes "3.3568E4"); the JSON-LD algorithm does
// so for JSON numbers only. A value of the data keeps its lexical form in RML: such
// literals go through toRDF under a placeholder datatype, put back afterwards.
const XSD_DOUBLE = 'http://www.w3.org/2001/XMLSchema#double';
const KEPT_DOUBLE = 'urn:x-rocketrml:xsd-double-lexical-form';

const markStringDoubles = (node) => {
  if (Array.isArray(node)) {
    node.forEach(markStringDoubles);
  } else if (node && typeof node === 'object') {
    if (node['@type'] === XSD_DOUBLE && typeof node['@value'] === 'string') {
      node['@type'] = KEPT_DOUBLE;
    }
    Object.values(node).forEach(markStringDoubles);
  }
};

// The N-Quads lines of the output, sorted as jsonld.toRDF sorts them. A list of
// lines rather than one string: the N-Quads of a large output (GTFS-Madrid-Bench at
// scale 10, 4 million quads) are longer than the longest string of V8 (2^29 characters,
// "RangeError: Invalid string length").
const toNQuadsLines = async (out) => {
  markStringDoubles(out);
  const dataset = await jsonld.toRDF(out);
  return dataset
    .map((quad) => NQuads.serializeQuad(quad).split(`^^<${KEPT_DOUBLE}>`).join(`^^<${XSD_DOUBLE}>`))
    .sort();
};

const toRDF = async (out) => (await toNQuadsLines(out)).join('');

// Write the lines to a file a chunk at a time.
const writeLines = (path, lines) => {
  const fd = fs.openSync(path, 'w');
  try {
    for (let i = 0; i < lines.length; i += 10000) {
      fs.writeSync(fd, lines.slice(i, i + 10000).join(''));
    }
  } finally {
    fs.closeSync(fd);
  }
};

const parseFile = async (pathInput, pathOutput, options = {}) => {
  cleanCache(options);
  const contents = fs.readFileSync(pathInput, 'utf8');

  const res = await mapfile.expandedJsonMap(contents, options);
  const output = await process(res, options);
  const out = await clean(output, options);
  if (options && options.toRDF && options.toRDF === true) {
    const lines = await toNQuadsLines(out);
    helper.consoleLogIf(`Writing to ${pathOutput}`, options);
    writeLines(pathOutput, lines);
    try {
      return lines.join('');
    } catch (e) {
      if (e instanceof RangeError) {
        // too long for one string: the output is in the file only
        return undefined;
      }
      throw e;
    }
  }
  helper.consoleLogIf(`Writing to ${pathOutput}`, options);
  fs.writeFileSync(pathOutput, JSON.stringify(out, null, 2));
  return out;
};

const parseFileLive = async (mapFile, inputFiles, options = {}) => {
  cleanCache(options);
  const res = await mapfile.expandedJsonMap(mapFile);
  options.inputFiles = inputFiles;
  const output = await process(res, options);
  const out = await clean(output, options);
  if (options && options.toRDF && options.toRDF === true) {
    const rdf = await toRDF(out);
    return rdf;
  }
  return out;
};

const process = async (res, options) => {
  let output = {};
  options = helper.createMeta(options);
  for (const id of res.topLevelMappings) {
    let o = objectHelper.findIdinObjArr(res.data, id, res.prefixes);
    o = prefixhelper.checkAndRemovePrefixesFromObject(o, res.prefixes);
    const source = logicalSource.parseLogicalSource(
      res.data,
      res.prefixes,
      o.logicalSource['@id'],
    );
    switch (source.referenceFormulation) {
      case 'XPath':
        helper.consoleLogIf('Processing with XPath', options);
        let resultXML = await parser.parseFile(
          res.data,
          o,
          res.prefixes,
          source.source,
          source.iterator,
          options,
          'XPath',
        );
        resultXML = resultXML.length === 1 ? resultXML[0] : resultXML;
        output[id] = resultXML;
        options.$metadata.inputFiles[id] = source.source;
        helper.consoleLogIf('Done', options);
        break;
      case 'JSONPath':
        helper.consoleLogIf('Processing with JSONPath', options);
        let resultJSON = await parser.parseFile(
          res.data,
          o,
          res.prefixes,
          source.source,
          source.iterator,
          options,
          'JSONPath',
        );
        resultJSON = resultJSON.length === 1 ? resultJSON[0] : resultJSON;
        output[id] = resultJSON;
        options.$metadata.inputFiles[id] = source.source;
        helper.consoleLogIf('Done', options);
        break;
      case 'CSV':
        helper.consoleLogIf('Processing with CSV', options);
        let resultCSV = await parser.parseFile(
          res.data,
          o,
          res.prefixes,
          source.source,
          source.iterator,
          options,
          'CSV',
        );
        resultCSV = resultCSV.length === 1 ? resultCSV[0] : resultCSV;
        output[id] = resultCSV;
        options.$metadata.inputFiles[id] = source.source;
        helper.consoleLogIf('Done', options);
        break;
      default:
        // not supported referenceFormulation
        throw new Error(
          `Error during processing logicalsource: ${source.referenceFormulation} not supported!`,
        );
    }
  }
  output = mergeJoin(output, res, options);
  return output;
};

const mergeJoin = (output, res, options) => {
  helper.consoleLogIf('Perform joins..', options);
  for (const key in output) {
    output[key] = helper.addArray(output[key]);
    const firstentry = output[key][0];
    // every entry in a mapping will have the same join properties, thus take join paths from first entry
    if (firstentry && firstentry.$parentTriplesMap) {
      const p = firstentry.$parentTriplesMap;
      for (const predicate in p) {
        const predicateData = p[predicate];
        for (const i in predicateData) {
          const singleJoin = predicateData[i];
          let parentId = prefixhelper.checkAndRemovePrefixesFromObject(
            objectHelper.findIdinObjArr(
              res.data,
              singleJoin.mapID,
              res.prefixes,
            ),
            res.prefixes,
          );
          parentId = parentId.parentTriplesMap['@id'];

          const toMapData = helper.addArray(output[parentId]);

          if (singleJoin.joinCondition) {
            const cache = {};
            singleJoin.joinCondition.forEach(({ parentPath }) => {
              cache[parentPath] = {};
              for (const tmd of toMapData) {
                let parentData = tmd.$parentPaths[parentPath];
                parentData = helper.addArray(parentData);
                if (parentData.length !== 1) {
                  console.warn(
                    `joinConditions parent must return only one value! Parent: ${parentData}`,
                  );
                  break;
                }
                parentData = parentData[0];
                if (!cache[parentPath][parentData]) {
                  cache[parentPath][parentData] = [];
                }
                cache[parentPath][parentData].push(tmd['@id']);
              }
            });

            for (const entry of output[key]) {
              const joinConditions =
                entry.$parentTriplesMap[predicate][i].joinCondition;

              const childrenMatchingCondition = joinConditions.map((cond) => {
                let childData = cond.child;
                childData = helper.addArray(childData);
                if (childData.length !== 1) {
                  console.warn(
                    `joinConditions child must return only one value! Child: ${childData}`,
                  );
                }
                childData = childData[0];

                const matchingChildren = cache[cond.parentPath][childData];
                return matchingChildren || [];
              });

              const childrenMatchingAllCondition = helper.intersection(
                childrenMatchingCondition,
              );

              for (const data of childrenMatchingAllCondition) {
                helper.addToObjInId(entry, predicate, data);
              }
            }
          } else {
            const parentSource = objectHelper.findIdinObjArr(
              res.data,
              parentId,
              res.prefixes,
            ).logicalSource['@id'];
            const childSource = objectHelper.findIdinObjArr(
              res.data,
              key,
              res.prefixes,
            ).logicalSource['@id'];
            const haveSameLogicalSource = parentSource === childSource;
            if(haveSameLogicalSource) {
              for (const tmd of toMapData) {
                for (const entry of output[key]) {
                  if(tmd._index === entry._index) {
                    helper.addToObjInId(entry, predicate, tmd['@id']);
                  }
                }
              }
            } else {
              for (const tmd of toMapData) {
                for (const entry of output[key]) {
                  helper.addToObjInId(entry, predicate, tmd['@id']);
                }
              }
            }
          }
        }
      }
    }
  }
  return output;
};

const clean = async (output, options) => {
  output = objectHelper.removeMeta(output);
  objectHelper.removeEmpty(output);

  // change rdf:type to @type
  objectHelper.convertType(output);

  if (options && options.replace && options.replace === true) {
    helper.consoleLogIf('Replacing BlankNodes..', options);
    output = replaceHelper.replace(output);
  }
  if (options && options.compress) {
    let compacted = await jsonld.compact(output, options.compress);
    const context = compacted['@context'];
    const data = compacted['@graph'];
    if (data && data.length > 1) {
      compacted = data;
      compacted.forEach((c) => {
        context['@language'] = options.language;
        c['@context'] = context;
      });
    } else {
      compacted['@context']['@language'] = options.language;
    }
    helper.consoleLogIf('FINISHED', options);
    return compacted;
  }
  if (options && options.language) {
    if (Array.isArray(output)) {
      output.forEach((d) => {
        d['@context'] = {
          '@language': options.language,
        };
      });
    } else {
      output['@context'] = {
        '@language': options.language,
      };
    }
  }
  helper.consoleLogIf('FINISHED', options);
  return output;
};

const cleanCache = (data) => {
  if (data && data.cache) {
    delete data.cache;
  }
};

module.exports.parseFile = parseFile;
module.exports.parseFileLive = parseFileLive;
