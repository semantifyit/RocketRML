const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const helper = require('./helper.js');
const fs = require('fs');
const logicalSource = require('../input-parser/logicalSourceParser.js');
let {JSONPath} = require("jsonpath-plus");

let count=0;

const parseJSON=(data,currObject,prefixes,source, iterator,options)=>{
    let file;
    count=0;
    if(options && options.inputFiles){
        source=source.replace('./','');
        if(!options.inputFiles[source]){
            throw('File '+source+' not specified!')
        }
        file=JSON.parse(options.inputFiles[source]);
    }else{
        console.log('Reading file...');
        file = JSON.parse(fs.readFileSync(source,"utf-8"));

    }
    let result = iterateFile(data,currObject,prefixes,iterator,file,options);
    return result;
};

function iterateFile(data, currObject, prefixes, iterator, file,options) {
    //check if it is a function
    if(currObject.functionValue) {
        let functionMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,currObject.functionValue['@id']),prefixes);
        let definition=functionHelper.findDefinition(data,functionMap.predicateObjectMap,prefixes);
        let parameters=functionHelper.findParameters(data,functionMap.predicateObjectMap,prefixes);
        let calcParameters=helper.calculateParameters(file,parameters,'JSONPath');

        return functionHelper.executeFunction(definition,calcParameters,options);

    }
    //get subjectMap
    let subjectMapId = currObject.subjectMap['@id'];
    if(!subjectMapId){
        throw('Error: one subjectMap needed!');
    }
    let subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,subjectMapId),prefixes);

    //get all possible things in subjectmap
    let iteratorPaths;
    if(iterator){
        iteratorPaths = JSONPath({path: iterator, json: file, resultType: 'path'});
    }else{
        iteratorPaths=JSONPath({path: '$', json: file, resultType: 'path'});
    }
    iteratorPaths=helper.addArray(iteratorPaths);
    let result=[];
    let type=undefined;
    if(subjectMap.class){
        if(Array.isArray(subjectMap.class)){
            type=[];
            subjectMap.class.forEach(function(sm){
                type.push(prefixhelper.replacePrefixWithURL(sm['@id'],prefixes));
            })
        }else{
            type=prefixhelper.replacePrefixWithURL(subjectMap.class['@id'],prefixes);
        }
    }
    let functionMap=objectHelper.findIdinObjArr(data,type);
    let idTemplate=undefined;
    if(subjectMap.template){
        idTemplate=subjectMap.template;
    }
    let reference=undefined;
    if(subjectMap.reference){
        reference=subjectMap.reference;
    }

    let constant=undefined;
    if(subjectMap.constant){
        constant=subjectMap.constant;
    }
    if(reference){
        iteratorPaths.forEach(function(p){
            count++;
            let obj={};
            if(functionMap){
                //the subjectMapping contains a functionMapping
                let node=helper.cutArray(JSONPath({path: p, json: file}));
                type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'JSONPath');
            }
            let nodes=JSONPath({path: p+'.'+reference, json: file});
            nodes.forEach(function(idNode){
                if(type){
                    obj['@type']=type;
                }
                let temp=idNode;
                temp=helper.isURL(temp) ? temp : helper.addBase(temp,prefixes);
                if(temp.indexOf(' ') === -1){
                    obj['@id']=temp;
                    obj=doObjectMappings(currObject,data,p,prefixes,file,obj,options);
                    if(!obj['@id']){
                        obj['@id']=currObject['@id']+'_'+count;
                    }

                    obj['$iter']=p;
                    result.push(obj);
                }
            });
        });

    }else if(idTemplate){
        count++;
        iteratorPaths.forEach(function(p){
            let obj={};
            let ids=calculateTemplate(file,p,idTemplate,prefixes);
            ids.forEach(function(id){
                if(subjectMap.termType){
                    switch(subjectMap.termType['@id']){
                        case "rr:BlankNode":
                            id='_:'+id;
                            break;
                        case "rr:IRI":
                            if((!idTemplate && !reference) || (idTemplate && reference)){
                                throw('Must use exactly one of - rr:template and rr:reference in SubjectMap!');
                            }
                            if(!helper.isURL(id)){
                                id=helper.addBase(id,prefixes)
                            }
                            break;
                        case "rr:Literal":
                            throw('Cannot use literal in SubjectMap!');

                    }
                }
                if(functionMap){
                    //the subjectMapping contains a functionMapping
                    let node=helper.cutArray(JSONPath({path: p, json: file}));
                    type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'JSONPath');
                }
                obj['@id']=id;
                if(type){
                    obj['@type']=type;
                }
                obj=doObjectMappings(currObject,data,p,prefixes,file,obj,options);
                if(!obj['@id']){
                    obj['@id']=currObject['@id']+'_'+count;
                }
                obj['$iter']=p;
                result.push(obj);
            });
        });
    }else{
        //BlankNode with no template or id
        iteratorPaths.forEach(function(p){
            count++;
            if(functionMap){
                //the subjectMapping contains a functionMapping
                let node=helper.cutArray(JSONPath({path: p, json: file}));
                type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'JSONPath');
            }
            let nodes=JSONPath({path: p, json: file});
            let obj={};
            nodes.forEach(function(){
                if(constant){
                    obj['@id']=helper.getConstant(constant,prefixes);
                }
                if(type){
                    obj['@type']=type;
                }
                obj=doObjectMappings(currObject,data,p,prefixes,file,obj,options);
                if(!obj['@id']){
                    obj['@id']=currObject['@id']+'_'+count;
                }
                obj['$iter']=p;
                result.push(obj);
            });
        });
    }
    result=helper.cutArray(result);
    return result;
}

/*
currObject :current object in ttl file
data: the whole ttl file
path: the actual jsonpath
file: the whole file
obj: the result object
 */
function doObjectMappings(currObject, data, path, prefixes, file, obj,options) {
    //find objectMappings
    if(currObject.predicateObjectMap){
        let objectMapArray= currObject.predicateObjectMap;
        objectMapArray=helper.addArray(objectMapArray);
        objectMapArray.forEach(function(o){
            let id=o['@id'];
            let mapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,id),prefixes);
            let predicate=undefined;
            if(mapping.predicate){
                if(Array.isArray(mapping.predicate)){
                    predicate=[];
                    mapping.predicate.forEach(function(pre){
                        predicate.push(prefixhelper.replacePrefixWithURL(pre['@id'],prefixes));
                    })
                }else{
                    predicate=prefixhelper.replacePrefixWithURL(mapping.predicate['@id'],prefixes);
                }
            }else{
                if(mapping.predicateMap){
                    //in predicateMap only constant allowed
                    if(Array.isArray(mapping.predicateMap)){
                        predicate=[];
                        for (let t of mapping.predicateMap){
                            let temp=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,t['@id']),prefixes);
                            temp=temp.constant['@id'];
                            predicate.push(temp);
                        }
                    }else{
                        predicate=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,mapping.predicateMap['@id']),prefixes);
                        predicate=helper.getConstant(predicate.constant);
                    }
                }else{
                    throw('Error: no predicate specified!');
                }
            }
            if (Array.isArray(predicate)){
                for (let p of predicate){
                    handleSingleMapping(obj,mapping,p,prefixes,data,file,path,options);
                }
            }else{
                handleSingleMapping(obj,mapping,predicate,prefixes,data,file,path,options);
            }
        });
    }
    obj=helper.cutArray(obj);
    return obj;
}

/*
data: the data to insert
path: the actual jsonpath
predicate: the predicate to write to (obj[predicate]=data)
mapping: the actual mapping
prefixes: all prefixes
obj: the result object
file:the whole file
 */

const handleSingleMapping=(obj,mapping,predicate,prefixes,data,file,path,options)=>{
    predicate=prefixhelper.replacePrefixWithURL(predicate,prefixes);
    let object=undefined;
    if(mapping.object){
        object={
            '@id':prefixhelper.replacePrefixWithURL(mapping.object['@id'],prefixes)
        }
    }
    let objectmap=undefined;
    if(mapping.objectMap){
        objectmap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,mapping.objectMap['@id']),prefixes);
    }
    //check if it is an object or an objectMap and handle differently
    if(object){
        helper.addToObj(obj,predicate,object);
    }else{
        let reference=objectmap.reference;
        let constant=objectmap.constant;
        let language=objectmap.language;
        let datatype=objectmap.datatype;
        let template=objectmap.template;
        let termtype=objectmap.termType;

        if(template){
            //we have a template definition
            let temp=calculateTemplate(file,path,template,prefixes);
            temp.forEach(function(t) {
                if (termtype) {
                    switch (termtype['@id']) {
                        case "rr:BlankNode":
                            t = {
                                '@id':'_:' + t
                            };
                            break;
                        case "rr:IRI":
                            if (!helper.isURL(t)) {
                                t = {
                                    '@id':helper.addBase(t, prefixes)
                                }
                            }else{
                                t = {
                                    '@id':t
                                }
                            }
                            break;
                        case "rr:Literal":
                            break;
                    }
                }else{
                    t = {
                        '@id':t
                    };
                }
                t=helper.cutArray(t);
                helper.setObjPredicate(obj,predicate,t,language,datatype);
            });

        }else if(reference){
            //we have a reference definition
            let ns = JSONPath({path: path+'.'+reference, json: file});
            let arr=[];
            ns.forEach(function(n){
                arr.push(n)
            });
            if(arr.length>0){
                arr=helper.cutArray(arr);
                helper.setObjPredicate(obj,predicate,arr,language,datatype);
            }

        }else if(constant){
            //we have a constant definition
            constant=helper.cutArray(constant);
            constant=helper.getConstant(constant);
            helper.setObjPredicate(obj,predicate,constant,language,datatype);

        }else if(objectmap.parentTriplesMap && objectmap.parentTriplesMap['@id']){
            //we have a parentTriplesmap
            let nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']),prefixes);
            if(nestedMapping.functionValue){
                let temp=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,nestedMapping.functionValue['@id']),prefixes);
                if(!temp.logicalSource){
                    throw(temp['@id']+' has no logicalSource');
                }
                let nextsource = logicalSource.parseLogicalSource(data, prefixes, temp.logicalSource['@id']);
                if(obj[predicate]){
                    Array.isArray(obj[predicate]) ? obj.predicate=[obj[predicate]] : undefined;
                    obj[predicate].push(iterateFile(data,nestedMapping,prefixes,nextsource.iterator,file,options));
                }else{
                    obj[predicate]=iterateFile(data,nestedMapping,prefixes,nextsource.iterator,file,options);
                }
            }else{
                if(obj['$parentTriplesMap']){
                    let temp=obj['$parentTriplesMap'];
                    obj['$parentTriplesMap']=[];
                    obj['$parentTriplesMap'].push(temp);
                    obj['$parentTriplesMap'].push(objectmap['@id']);
                }else{
                    obj['$parentTriplesMap']=objectmap['@id'];
                }
            }
        }
    }
};

const getData=(path,object)=>{
    let ns = JSONPath({path: '$.'+path, json: object});
    if(ns.length>0){
        ns=helper.cutArray(ns);
        return ns;
    }else{
        return undefined;
    }
};

const calculateTemplate=(file,path,template,prefixes)=>{
    let beg=helper.locations('{',template);
    let end=helper.locations('}',template);
    let words=[];
    let templates=[];
    for (let i in beg){
        words.push(template.substr(beg[i]+1,end[i]-beg[i]-1));
    }
    words.forEach(function (w){
        let temp=JSONPath({path: path+'.' + w, json: file});
        for (let t in temp){
            if(!templates[t]){
                templates[t]=template;
            }
            if(!temp[t]){
                console.warn("Warning: template does not contain "+w);
                let temp=[];
                for (let i in templates){
                    if(i!==t){
                        temp[i]=templates[i]
                    }
                }
                templates=temp;
            }else{
                templates[t]=templates[t].replace('{'+w+'}',helper.toURIComponent(temp[t]));
            }

        }

    });
    for (let t in templates){
        templates[t]=helper.replaceEscapedChar(prefixhelper.replacePrefixWithURL(templates[t],prefixes));
    }
    return templates;
};


module.exports.parseJSON=parseJSON;
module.exports.getData=getData;