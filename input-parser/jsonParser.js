const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const logicalSource = require('../input-parser/logicalSourceParser.js');
const helper = require('./helper.js');
const fs = require('fs');


let {JSONPath} = require("jsonpath-plus");

const parseJSON=(data,currObject,prefixes,source, iterator,options)=>{
    let file;
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
    return iterateFile(data,currObject,prefixes,iterator,file,iterator,options);
};

function iterateFile(data, currObject, prefixes, iterator, file,nextIterator,options) {
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
    let iteratorNodes;
    if(iterator){
        iteratorNodes = JSONPath({path: iterator, json: file});
    }else{
        iteratorNodes=file;
    }
    iteratorNodes=helper.addArray(iteratorNodes);
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
        iteratorNodes.forEach(function(n){
            let obj={};
            if(functionMap){
                //the subjectMapping contains a functionMapping
                type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'JSONPath');
            }
            let nodes=JSONPath({path: reference, json: n});
            nodes.forEach(function(idNode){
                if(type){
                    obj['@type']=type;
                }
                let temp=idNode;
                temp=helper.isURL(temp) ? temp : helper.addBase(helper.toURIComponent(temp),prefixes);
                obj['@id']=temp;
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj,nextIterator,options);
                result.push(obj);
            });
        });

    }else if(idTemplate){
        iteratorNodes.forEach(function(n){
            let obj={};
            let ids=calculateTemplate(n,idTemplate,prefixes);
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
                    type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'JSONPath');
                }
                obj['@id']=id;
                if(type){
                    obj['@type']=type;
                }
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj,nextIterator,options);
                result.push(obj);
            });
        });
    }else{
        //BlankNode with no template or id
        iteratorNodes.forEach(function(n){
            if(functionMap){
                //the subjectMapping contains a functionMapping
                type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'JSONPath');
            }
            let nodes=JSONPath({path: '$', json: n});
            let obj={};
            nodes.forEach(function(){
                if(constant){
                    obj['@id']=helper.getConstant(constant,prefixes);
                }
                if(type){
                    obj['@type']=type;
                }
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj,nextIterator,options);
                result.push(obj);
            });
        });
    }
    result=helper.cutArray(result);
    return result;
}


function doObjectMappings(currObject, data, iterator, prefixes, node, obj,fullIterator,options) {
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
                    handleSingleMapping(obj,mapping,p,prefixes,data,node,fullIterator,options);
                }
            }else{
                handleSingleMapping(obj,mapping,predicate,prefixes,data,node,fullIterator,options);
            }
        });
    }
    obj=helper.cutArray(obj);
    return obj;
}

const handleSingleMapping=(obj,mapping,predicate,prefixes,data,node,fullIterator,options)=>{
    predicate=prefixhelper.replacePrefixWithURL(predicate,prefixes);
    let object=undefined;
    if(mapping.object){
        object=prefixhelper.replacePrefixWithURL(mapping.object['@id'],prefixes);
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
            let temp=calculateTemplate(node,template,prefixes);
            temp.forEach(function(t) {
                if (termtype) {
                    switch (termtype['@id']) {
                        case "rr:BlankNode":
                            t = '_:' + t;
                            break;
                        case "rr:IRI":
                            if (!helper.isURL(t)) {
                                t = helper.addBase(t, prefixes)
                            }
                            break;
                        case "rr:Literal":
                        //throw('Cannot use literal in template!');

                    }
                }
                t=helper.cutArray(t);
                helper.setObjPredicate(obj,predicate,t,language,datatype);
            });

        }else if(reference){
            //we have a reference definition
            let ns = JSONPath({path: '$.'+reference, json: node});
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
            if(!nestedMapping.logicalSource && !nestedMapping.functionValue){
                throw(nestedMapping['@id']+' has no logicalSource')
            }else{
                let nextSource;
                //check if the nested mapping is a function
                if(nestedMapping.functionValue){
                    let temp=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,nestedMapping.functionValue['@id']),prefixes);
                    if(!temp.logicalSource){
                        throw(temp['@id']+' has no logicalSource');
                    }
                    nextSource = logicalSource.parseLogicalSource(data, prefixes, temp.logicalSource['@id']);

                }else{
                    nextSource = logicalSource.parseLogicalSource(data, prefixes, nestedMapping.logicalSource['@id']);
                }
                //todo: remove nextIterator, iteratorExtension and nextSource?
                //************************************
                let nextIterator =nextSource.iterator;
                let iteratorExtension=undefined;
                let diff=nextIterator.replace(fullIterator,'');
                if(diff && diff!==''){
                    iteratorExtension=helper.cleanString(diff);
                }
                //************************************

                if(obj[predicate]){
                    Array.isArray(obj[predicate]) ? obj.predicate=[obj[predicate]] : undefined;
                    obj[predicate].push(iterateFile(data,nestedMapping,prefixes,iteratorExtension,node,nextIterator,options));
                }else{
                    obj[predicate]=iterateFile(data,nestedMapping,prefixes,iteratorExtension,node,nextIterator,options);
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

const calculateTemplate=(node,template,prefixes)=>{
    let beg=helper.locations('{',template);
    let end=helper.locations('}',template);
    let words=[];
    let templates=[];
    for (let i in beg){
        words.push(template.substr(beg[i]+1,end[i]-beg[i]-1));
    }
    words.forEach(function (w){
        let temp=JSONPath({path: w, json: node});
        if (temp.length<node.length){
            throw("Error: when using templates, no null values are allowed in input!")
        }
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