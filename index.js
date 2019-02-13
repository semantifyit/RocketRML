const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const jsonParser = require('./input-parser/jsonParser.js');
const objectHelper = require('./helper/objectHelper.js');
const replaceHelper = require('./helper/replace.js');
const prefixhelper = require('./helper/prefixHelper.js');
const jsonld = require('jsonld');

const fs = require('fs');

let parseFile = (pathInput, pathOutput,options) =>{
    return new Promise(function(resolve,reject){
        fs.readFile(pathInput, 'utf8', async function(err, contents) {
            if(err){
                reject('Error reading file '+pathInput);
            }
            mapfile.expandedJsonMap(contents, options).then(function (res) {
                process(res, options).then(function (output) {
                    clean(output, options).then(function (output) {
                            console.log('Writing to '+pathOutput);
                            fs.writeFileSync(pathOutput,JSON.stringify(output,null,2));
                            resolve(output);
                        },
                        function (error) {
                            reject(error);
                        });
                }, function (error) {
                    reject(error);
                });
            }, function (error) {
                reject(error);
            });
        });
    });
};

let parseFileLive = (mapFile, inputFiles,options) => {
    return new Promise(function (resolve, reject) {
        mapfile.expandedJsonMap(mapFile, options).then(function (res) {
            options.inputFiles = inputFiles;
            process(res, options).then(function (output) {
                clean(output, options).then(function (output) {
                        resolve(output);
                    },
                    function (error) {
                        reject(error);
                    });
            }, function (error) {
                reject(error);
            });
        }, function (error) {
            reject(error);
        });
    });
};

let process=(res,options)=>{
    return new Promise(function(resolve,reject) {
        let output = [];
        res.topLevelMappings.forEach(function (id) {
            let o = objectHelper.findIdinObjArr(res.data, id);
            o = prefixhelper.checkAndRemovePrefixesFromObject(o, res.prefixes);
            let source = logicalSource.parseLogicalSource(res.data, res.prefixes, o.logicalSource['@id']);
            switch (source.referenceFormulation) {
                case "XPath":
                    console.log('Processing with XPath');
                    try {
                        console.time("xmlExecution");
                        let resultXML = xmlParser.parseXML(res.data, o, res.prefixes, source.source, source.iterator, options);
                        resultXML = resultXML.length === 1 ? resultXML[0] : resultXML;
                        output.push(resultXML);
                        console.log('Done');
                        console.timeEnd("xmlExecution");
                    } catch (err) {
                       throw(err);
                    }
                    break;
                case "JSONPath":
                    console.log('Processing with JSONPath');
                    try {
                        console.time("jsonExecution");
                        let resultJSON = jsonParser.parseJSON(res.data, o, res.prefixes, source.source, source.iterator, options);
                        resultJSON = resultJSON.length === 1 ? resultJSON[0] : resultJSON;
                        output.push(resultJSON);
                        console.log('Done');
                        console.timeEnd("jsonExecution");
                    } catch (err) {
                        throw("Error during parsing");
                    }
                    break;
                default:
                    //not supported referenceFormulation
                    throw("Error during processing logicalsource: " + source.referenceFormulation + " not supported!");
            }
        });
        resolve(output);
    });
};

let clean=(output,options)=>{
    return new Promise(function(resolve,reject){
        //remove unnecessary brackets
        while(output.length===1){
            output=output[0];
        }

        objectHelper.removeEmpty(output);

        //change rdf:type to @type
        objectHelper.convertType(output);

        if(options&&options.replace){
            console.log('Replacing BlankNodes..');
            output=replaceHelper.replace(output,options.replace);
        }
        if(options&&options.compress){
            jsonld.compact(output, options.compress, function(err, compacted) {
                if(err){
                    reject(err);
                }
                let context=compacted['@context'];
                let data=compacted['@graph'];
                if(data && data.length >1){
                    compacted=data;
                    compacted.forEach(function(c){
                        c['@context']=context;
                    })
                }
                console.log('FINISHED');
                resolve(compacted);
            });
        }else{
            console.log('FINISHED');
            resolve(output);
        }
    });
};


module.exports.parseFile=parseFile;
module.exports.parseFileLive=parseFileLive;