const fs = require('fs');
const jsonld = require('jsonld');
const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const parser = require('./input-parser/parser.js');
const objectHelper = require('./helper/objectHelper.js');
const replaceHelper = require('./helper/replace.js');
const prefixhelper = require('./helper/prefixHelper.js');
const helper = require('./input-parser/helper.js');

const parseFile = (pathInput, pathOutput, options) => new Promise(((resolve, reject) => {
  fs.readFile(pathInput, 'utf8', async (err, contents) => {
    if (err) {
      reject(`Error reading file ${pathInput}`);
    }
    mapfile.expandedJsonMap(contents, options).then((res) => {
      process(res, options).then((output) => {
        clean(output, options).then((out) => {
          if (options && options.toRDF && options.toRDF === true) {
            jsonld.toRDF(out, { format: 'application/n-quads' }, (errRDF, rdf) => {
              if (errRDF) {
                reject(errRDF);
              } else {
                helper.consoleLogIf(`Writing to ${pathOutput}`, options);
                fs.writeFileSync(pathOutput, rdf);
                resolve(rdf);
              }
            });
          } else {
            helper.consoleLogIf(`Writing to ${pathOutput}`, options);
            fs.writeFileSync(pathOutput, JSON.stringify(out, null, 2));
            resolve(out);
          }
        },
        (error) => {
          reject(error);
        });
      }, (error) => {
        reject(error);
      });
    }, (error) => {
      reject(error);
    });
  });
}));

const parseFileLive = (mapFile, inputFiles, options) => new Promise(((resolve, reject) => {
  mapfile.expandedJsonMap(mapFile, options).then((res) => {
    options.inputFiles = inputFiles;
    process(res, options).then((output) => {
      clean(output, options).then((out) => {
        if (options && options.toRDF && options.toRDF === true) {
          jsonld.toRDF(out, { format: 'application/n-quads' }, (err, rdf) => {
            if (err) {
              reject(err);
            } else {
              resolve(rdf);
            }
          });
        } else {
          resolve(out);
        }
      },
      (error) => {
        reject(error);
      });
    }, (error) => {
      reject(error);
    });
  }, (error) => {
    reject(error);
  });
}));


let process = (res, options) => new Promise(((resolve, reject) => {
  let output = {};
  options = helper.createMeta(options);

  res.topLevelMappings.forEach((id) => {
    let o = objectHelper.findIdinObjArr(res.data, id);
    o = prefixhelper.checkAndRemovePrefixesFromObject(o, res.prefixes);
    const source = logicalSource.parseLogicalSource(res.data, res.prefixes, o.logicalSource['@id']);
    switch (source.referenceFormulation) {
      case 'XPath':
        helper.consoleLogIf('Processing with XPath', options);
        try {
          let resultXML = parser.parseFile(res.data, o, res.prefixes, source.source, source.iterator, options, 'XPath');
          resultXML = resultXML.length === 1 ? resultXML[0] : resultXML;
          output[id] = resultXML;
          options.$metadata.inputFiles[id] = source.source;
          helper.consoleLogIf('Done', options);
        } catch (err) {
          reject(err);
        }
        break;
      case 'JSONPath':
        helper.consoleLogIf('Processing with JSONPath', options);
        try {
          let resultJSON = parser.parseFile(res.data, o, res.prefixes, source.source, source.iterator, options, 'JSONPath');
          resultJSON = resultJSON.length === 1 ? resultJSON[0] : resultJSON;
          output[id] = resultJSON;
          options.$metadata.inputFiles[id] = source.source;
          helper.consoleLogIf('Done', options);
        } catch (err) {
          reject(err);
        }
        break;
      case 'CSV':
        helper.consoleLogIf('Processing with CSV', options);
        try {
          let resultCSV = parser.parseFile(res.data, o, res.prefixes, source.source, source.iterator, options, 'CSV');
          resultCSV = resultCSV.length === 1 ? resultCSV[0] : resultCSV;
          output[id] = resultCSV;
          options.$metadata.inputFiles[id] = source.source;
          helper.consoleLogIf('Done', options);
        } catch (err) {
          reject(err);
        }
        break;
      default:
        // not supported referenceFormulation
        reject(`Error during processing logicalsource: ${source.referenceFormulation} not supported!`);
    }
  });
  output = mergeJoin(output, res, options);
  resolve(output);
}));

let mergeJoin = (output, res, options) => {
  helper.consoleLogIf('Perform joins..', options);
  for (const key in output) {
    output[key] = helper.addArray(output[key]);
    const firstentry = output[key][0];
    // for (const entry of output[key]) {
    if (firstentry.$parentTriplesMap) {
      const p = firstentry.$parentTriplesMap;
      for (const predicate in p) {
        // property: where to store it;
        // parentID: id of the parentMapping
        // d: whole data entry
        const predicateData = p[predicate];
        for (const i in predicateData) {
          const d = predicateData[i];
          let parentId = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data, d.mapID), res.prefixes);
          parentId = parentId.parentTriplesMap['@id'];
          const toMapData = helper.addArray(output[parentId]);

          if (d.joinCondition) {
            const cache = {};
            const parentPath = d.parentPath;
            for (const tmd of toMapData) {
              let parentData = tmd.$parentPaths[parentPath];
              if (parentData.length !== 1) {
                console.warn(`joinConditions parent must return only one value! Parent: ${parentData}`);
                break;
              }
              parentData = parentData[0];
              if (!cache[parentData]) {
                cache[parentData] = [];
              }
              cache[parentData].push(tmd['@id']);
            }
            for (const entry of output[key]) {
              let childData = entry.$parentTriplesMap[predicate][i].child;
              if (childData.length !== 1) {
                console.warn(`joinConditions child must return only one value! Child: ${childData}`);
                break;
              }
              childData = childData[0];
              for (const data of cache[childData]) {
                helper.addToObjInId(entry, predicate, data);
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
  return output;
};


let clean = (output, options) => new Promise(((resolve, reject) => {
  output = objectHelper.removeMeta(output);
  objectHelper.removeEmpty(output);

  // change rdf:type to @type
  objectHelper.convertType(output);

  if (options && options.replace && options.replace === true) {
    helper.consoleLogIf('Replacing BlankNodes..', options);
    output = replaceHelper.replace(output);
  }
  if (options && options.compress) {
    jsonld.compact(output, options.compress, (err, compacted) => {
      if (err) {
        reject(err);
      }
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
      resolve(compacted);
    });
  } else {
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
    resolve(output);
  }
}));


module.exports.parseFile = parseFile;
module.exports.parseFileLive = parseFileLive;
