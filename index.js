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
          if (options && options.toRDF && options.toRDF === 'true') {
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
        if (options && options.toRDF && options.toRDF === 'true') {
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
          console.time('xmlExecution');
          let resultXML = parser.parseFile(res.data, o, res.prefixes, source.source, source.iterator, options, 'XPath');
          resultXML = resultXML.length === 1 ? resultXML[0] : resultXML;
          output[id] = resultXML;
          options.$metadata.inputFiles[id] = source.source;
          helper.consoleLogIf('Done', options);
          console.timeEnd('xmlExecution');
        } catch (err) {
          console.timeEnd('xmlExecution');
          reject(err);
        }
        break;
      case 'JSONPath':
        helper.consoleLogIf('Processing with JSONPath', options);
        try {
          console.time('jsonExecution');
          let resultJSON = parser.parseFile(res.data, o, res.prefixes, source.source, source.iterator, options, 'JSONPath');
          resultJSON = resultJSON.length === 1 ? resultJSON[0] : resultJSON;
          output[id] = resultJSON;
          options.$metadata.inputFiles[id] = source.source;
          helper.consoleLogIf('Done', options);
          console.timeEnd('jsonExecution');
        } catch (err) {
          console.timeEnd('jsonExecution');
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
    for (const entry of output[key]) {
      if (entry.$parentTriplesMap) {
        const ptm = helper.addArray(entry.$parentTriplesMap);
        for (const p of ptm) {
          for (const predicate in p) {
            // property: where to store it;
            // parentID: id of the parentMapping
            // d: whole data entry
            const predicateData = p[predicate];
            for (const d of predicateData) {
              let parentId = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data, d.mapID), res.prefixes);
              parentId = parentId.parentTriplesMap['@id'];
              const toMapData = helper.addArray(output[parentId]);
              for (const tmd of toMapData) {
                if (d.joinCondition) {
                // perform joins
                  const childData = d.child;
                  const parentPath = d.parentPath;
                  const parentData = tmd.$parentPaths[parentPath];

                  if (childData.length !== 1 || parentData.length !== 1) {
                    helper.consoleLogIf(`joinConditions parent and child must return only one value! Parent: ${parentData}, Child: ${childData}`, options);
                    break;
                  }
                  if (childData[0] === parentData[0]) {
                  // add to object;
                    helper.addToObjInId(entry, predicate, tmd['@id']);
                  }
                } else {
                // map all existing
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


let clean = (output, options) => new Promise(((resolve, reject) => {
  output = objectHelper.removeMeta(output);
  objectHelper.removeEmpty(output);

  // change rdf:type to @type
  objectHelper.convertType(output);

  if (options && options.replace && options.replace === 'true') {
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
