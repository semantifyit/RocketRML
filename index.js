const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const jsonParser = require('./input-parser/jsonParser.js');
const objectHelper = require('./helper/objectHelper.js');
const replaceHelper = require('./helper/replace.js');
const prefixhelper = require('./helper/prefixHelper.js');
const helper=require('./input-parser/helper.js');
const jsonld = require('jsonld');
const xpath = require('xpath');
let {JSONPath} = require("jsonpath-plus");

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
                            if(options && options.toRDF && options.toRDF==="true"){
                                jsonld.toRDF(output, {format: 'application/n-quads'}, (err, rdf) => {
                                    if (err) {
                                        reject(err)
                                    } else {
                                        console.log('Writing to '+pathOutput);
                                        fs.writeFileSync(pathOutput,rdf);
                                        resolve(rdf)
                                    }
                                });
                            }else{
                                console.log('Writing to '+pathOutput);
                                fs.writeFileSync(pathOutput,JSON.stringify(output,null,2));
                                resolve(output);
                            }
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
                    if(options && options.toRDF && options.toRDF==="true"){
                        jsonld.toRDF(output, {format: 'application/n-quads'}, (err, rdf) => {
                            if (err) {
                                reject(err)
                            } else {
                                resolve(rdf)
                            }
                        });
                    }else{
                        resolve(output);
                    }
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
        let output={};
        options=helper.createMeta(options);

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
                        output[id]=resultXML;
                        options['$metadata'].inputFiles[id]=source.source;
                        console.log('Done');
                        console.timeEnd("xmlExecution");
                    } catch (err) {
                        console.timeEnd("xmlExecution");
                        reject(err);
                    }
                    break;
                case "JSONPath":
                    console.log('Processing with JSONPath');
                    try {
                        console.time("jsonExecution");
                        let resultJSON = jsonParser.parseJSON(res.data, o, res.prefixes, source.source, source.iterator, options);
                        resultJSON = resultJSON.length === 1 ? resultJSON[0] : resultJSON;
                        output[id]=resultJSON;
                        options['$metadata'].inputFiles[id]=source.source;
                        console.log('Done');
                        console.timeEnd("jsonExecution");
                    } catch (err) {
                        console.timeEnd("jsonExecution");
                        reject(err);
                    }
                    break;
                default:
                    //not supported referenceFormulation
                    reject("Error during processing logicalsource: " + source.referenceFormulation + " not supported!");
            }
        });
        output=mergeJoin(output,res,options);
        resolve(output);
    });
};

let mergeJoin=(output, res, options) => {
    for (let key in output){
        if(!Array.isArray(output[key])){
            output[key]=[output[key]];
        }
        let file;
        let source=options['$metadata'].inputFiles[key];
        let datatype=helper.getDatatypeFromPath(source);
        file=readFile(source,options,datatype);

        for(let obj of output[key]){
            if(obj['$parentTriplesMap']){
                for (let key in  obj['$parentTriplesMap']){
                    obj['$parentTriplesMap'][key]=helper.addArray(obj['$parentTriplesMap'][key]);
                    for (let i in obj['$parentTriplesMap'][key]){
                        let data=obj['$parentTriplesMap'][key][i];
                        if(data.joinCondition){
                            let joinCondition=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data,data.joinCondition),res.prefixes);
                            let mapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data,data.mapID),res.prefixes).parentTriplesMap['@id'];
                            let parent=joinCondition.parent;
                            let child=joinCondition.child;

                            let mainIterator=obj['$iter'];
                            mainIterator+='.'+child;
                            let mainData=getData(file,mainIterator,obj['$ql']);
                            let file2;
                            let source=options['$metadata'].inputFiles[mapping];
                            let datatype=helper.getDatatypeFromPath(source);
                            file2=readFile(source,options,datatype);
                            //file2=helper.readFileJSON(source,options);
                            output[mapping]=helper.addArray(output[mapping]);
                            for (let d of output[mapping]){
                                let parentIterator=d['$iter'];
                                parentIterator=parentIterator+'.'+parent;
                                let parentData=getData(file2,parentIterator,d['$ql']);
                                if(mainData===parentData){
                                    helper.addToObjInId(obj,key,d['@id']);
                                }
                            }
                        }else{
                            let mapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(res.data,data.mapID),res.prefixes).parentTriplesMap['@id'];
                            output[mapping]=helper.addArray(output[mapping]);
                            for (let d of output[mapping]){
                                //TODO: fails if no id exists!!!
                                helper.addToObjInId(obj,key,d['@id']);
                            }
                        }
                    }
                }
            }
        }
    }
    return output;
};

let clean=(output,options)=>{
    return new Promise(function(resolve,reject){

        output=objectHelper.removeMeta(output);
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
                        context['@language']=options.language;
                        c['@context']=context;
                    })
                }else{
                    compacted['@context']['@language']=options.language;
                }
                console.log('FINISHED');
                resolve(compacted);
            });
        }else{
            if(options && options.language){
                if(Array.isArray(output)){
                    output.forEach(function(d){
                        d['@context']={
                            '@language':options.language,
                        }
                    })
                }else{
                    output['@context']={
                        '@language':options.language,
                    }
                }
            }
            console.log('FINISHED');
            resolve(output);
        }
    });
};

let readFile=(source,options,datatype)=>{
    switch(datatype){
        case 'json':
            return helper.readFileJSON(source,options);
        case'xml':
            return helper.readFileXML(source,options);
        default:
            throw ("unknown file format in: "+source);
    }
};

let getData=(file,path,ql)=>{
    switch(ql){
        case "JSONPath":
            let ns = JSONPath({path: path, json: file});
            if(ns.length>0){
                ns=helper.cutArray(ns);
                return ns;
            }else{
                return undefined;
            }
        case "XPath":
            return xmlParser.getData(path,file);
    }
};


module.exports.parseFile=parseFile;
module.exports.parseFileLive=parseFileLive;