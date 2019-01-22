const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const jsonParser = require('./input-parser/jsonParser.js');
const objectHelper = require('./helper/objectHelper.js');
const prefixhelper = require('./helper/prefixHelper.js');
const jsonld = require('jsonld');

const fs = require('fs');

let parseFile = (pathInput, pathOutput,options) =>{
    return new Promise(function(resolve,reject){
        fs.readFile(pathInput, 'utf8', async function(err, contents) {
            if(err){
                reject('Error reading file '+pathInput);
                throw('start(): Error during reading file: '+pathInput);
            }
            let res=await mapfile.expandedJsonMap(contents);
            let output=[];
            res.topLevelMappings.forEach(function (id){
                let o=objectHelper.findIdinObjArr(res.data,id);
                o=prefixhelper.checkAndRemovePrefixesFromObject(o,res.prefixes);
                let source= logicalSource.parseLogicalSource(res.data, res.prefixes, o.logicalSource['@id']);
                switch(source.referenceFormulation){
                    case "XPath":
                        console.log('Processing with XPath');
                        try{
                            console.time("xmlExecution");
                            let resultXML=xmlParser.parseXML(res.data, o, res.prefixes, source.source,source.iterator);
                            resultXML = resultXML.length===1 ? resultXML[0]:resultXML;
                            output.push(resultXML);
                            console.log('Done');
                            console.timeEnd("xmlExecution");
                        }catch(err){
                            reject(err);
                            throw('start(): Error during parsing');
                        }
                        break;
                    case "JSONPath":
                        console.log('Processing with JSONPath');
                        try{
                            console.time("jsonExecution");
                            let resultJSON=jsonParser.parseJSON(res.data, o, res.prefixes, source.source,source.iterator);
                            resultJSON = resultJSON.length===1 ? resultJSON[0]:resultJSON;
                            output.push(resultJSON);
                            console.log('Done');
                            console.timeEnd("jsonExecution");
                        }catch(err){
                            reject(err);
                            throw('start(): Error during parsing');
                        }
                        break;
                    default:
                        //not supported referenceFormulation
                        reject('not supported referenceFormulation');
                        throw('start(): Error during processing logicalsource: '+source.referenceFormulation+' not supported!');
                }
            });
            console.log('Writing to '+pathOutput);
            //remove unnecessary brackets
            while(output.length===1){
                output=output[0];
            }
            if(options&&options.insert){
                console.log("Replacing")
                //Todo
            }

            if(options&&options.compress){
                jsonld.compact(output, options.compress, function(err, compacted) {
                    if(err){
                        reject(err);
                        throw('start(): Error during compacting result.');
                    }
                    let context=compacted['@context'];
                    let data=compacted['@graph'];
                    if(data && data.length >1){
                        compacted=data;
                        compacted.forEach(function(c){
                            c['@context']=context;
                        })
                    }
                    fs.writeFileSync(pathOutput,JSON.stringify(compacted,null,2));
                    resolve(compacted);
                    console.log('FINISHED');
                });
            }else{
                fs.writeFileSync(pathOutput,JSON.stringify(output,null,2));
                resolve(output);
                console.log('FINISHED');
            }
        });
    });
};

//TODO: way of invoking with strings instead of path to files


module.exports.parseFile=parseFile;