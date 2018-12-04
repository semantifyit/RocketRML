const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const jsonParser = require('./input-parser/jsonParser.js');
const objectHelper = require('./helper/objectHelper.js');
const prefixhelper = require('./helper/prefixHelper.js');

const fs = require('fs');

let parseFile = (pathInput, pathOutput,removePrefixes) =>{
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
                            let resultXML=xmlParser.parseXML(res.data, o, res.prefixes, source.source,source.iterator);
                            resultXML = resultXML.length===1 ? resultXML[0]:resultXML;
                            output.push(resultXML);
                            console.log('Done');
                        }catch(err){
                            reject(err);
                            throw('start(): Error during parsing');
                        }
                        break;
                    case "JSONPath":
                        console.log('Processing with JSONPath');
                        try{
                            let resultJSON=jsonParser.parseJSON(res.data, o, res.prefixes, source.source,source.iterator);
                            resultJSON = resultJSON.length===1 ? resultJSON[0]:resultJSON;
                            output.push(resultJSON);
                            console.log('Done');
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
            if(removePrefixes){
                output=prefixhelper.deleteAllPrefixesFromObject(output,res.prefixes);
            }
            fs.writeFileSync(pathOutput,JSON.stringify(output,null,2));
            resolve(output);
            console.log('FINISHED');
        });
    });
};

//TODO: way of invoking with strings instead of path to files


module.exports.parseFile=parseFile;