const { JSONPath } = require('jsonpath-plus');
const fs = require('fs');
const jsonld = require('jsonld');
const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const jsonParser = require('./input-parser/jsonParser.js');
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
                console.log(`Writing to ${pathOutput}`);
                fs.writeFileSync(pathOutput, rdf);
                resolve(rdf);
              }
            });
          } else {
            console.log(`Writing to ${pathOutput}`);
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
        console.log('Processing with XPath');
        try {
          console.time('xmlExecution');
          let resultXML = xmlParser.parseXML(res.data, o, res.prefixes, source.source, source.iterator, options);
          resultXML = resultXML.length === 1 ? resultXML[0] : resultXML;
          output[id] = resultXML;
          options.$metadata.inputFiles[id] = source.source;
          console.log('Done');
          console.timeEnd('xmlExecution');
        } catch (err) {
          console.timeEnd('xmlExecution');
          reject(err);
        }
        break;
      case 'JSONPath':
        console.log('Processing with JSONPath');
        try {
          console.time('jsonExecution');
          let resultJSON = jsonParser.parseJSON(res.data, o, res.prefixes, source.source, source.iterator, options);
          resultJSON = resultJSON.length === 1 ? resultJSON[0] : resultJSON;
          output[id] = resultJSON;
          options.$metadata.inputFiles[id] = source.source;
          console.log('Done');
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
  console.log('Perform ParentTriplesMap..');
  for (const key in output) {
    if (!Array.isArray(output[key])) {
      output[key] = [output[key]];
    }
    const source = options.$metadata.inputFiles[key];
    const datatype = helper.getDatatypeFromPath(source);
    const file = readFile(source, options, datatype);

    for (const obj of output[key]) {
      if (obj.$parentTriplesMap) {
        for (const k in obj.$parentTriplesMap) {
          obj.$parentTriplesMap[k] = helper.addArray(obj.$parentTriplesMap[k]);
          for (const i in obj.$parentTriplesMap[k]) {
            const data = obj.$parentTriplesMap[k][i];
            if (data.joinCondition) {
              const joinCondition = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data, data.joinCondition), res.prefixes);
              const mapping = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data, data.mapID), res.prefixes).parentTriplesMap['@id'];
              const parent = joinCondition.parent;
              const child = joinCondition.child;

              let mainIterator = obj.$iter;
              const seperator = getSeperator(obj.$ql);
              mainIterator += seperator + child;
              const mainData = getData(file, mainIterator, obj.$ql);
              const source2 = options.$metadata.inputFiles[mapping];
              const datatype2 = helper.getDatatypeFromPath(source2);
              const file2 = readFile(source2, options, datatype2);
              output[mapping] = helper.addArray(output[mapping]);
              for (const d of output[mapping]) {
                let parentIterator = d.$iter;
                const seperator2 = getSeperator(d.$ql);
                parentIterator = parentIterator + seperator2 + parent;
                const parentData = getData(file2, parentIterator, d.$ql);
                if (mainData !== undefined && parentData !== undefined && mainData === parentData) {
                  helper.addToObjInId(obj, k, d['@id']);
                } else {
                  console.log(`No join match for: ${mainData} and ${parentData}`);
                }
              }
            } else {
              const mapping = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data, data.mapID), res.prefixes).parentTriplesMap['@id'];
              output[mapping] = helper.addArray(output[mapping]);
              for (const d of output[mapping]) {
                helper.addToObjInId(obj, k, d['@id']);
              }
            }
          }
        }
      }
    }
  }
  console.log('Done');
  return output;
};

let clean = (output, options) => new Promise(((resolve, reject) => {
  output = objectHelper.removeMeta(output);
  objectHelper.removeEmpty(output);

  // change rdf:type to @type
  objectHelper.convertType(output);

  if (options && options.replace && options.replace === 'true') {
    console.log('Replacing BlankNodes..');
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
      console.log('FINISHED');
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
    console.log('FINISHED');
    resolve(output);
  }
}));

let readFile = (source, options, datatype) => {
  switch (datatype) {
    case 'json':
      return helper.readFileJSON(source, options);
    case 'xml':
      return helper.readFileXML(source, options);
    default:
      throw (`unknown file format in: ${source}`);
  }
};

let getData = (file, path, ql) => {
  switch (ql) {
    case 'JSONPath':
      let ns = JSONPath({ path, json: file });
      if (ns.length > 0) {
        ns = helper.cutArray(ns);
        return ns;
      }
      return undefined;

    case 'XPath':
      return xmlParser.getData(path, file);
    default:
      throw (`Don't know query-language ${ql}`);
  }
};

let getSeperator = (ql) => {
  switch (ql) {
    case 'JSONPath':
      return '.';
    case 'XPath':
      return '/';
    default:
      throw (`Don't know query-language ${ql}`);
  }
};


module.exports.parseFile = parseFile;
module.exports.parseFileLive = parseFileLive;
