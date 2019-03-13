const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const logicalSource = require('../input-parser/logicalSourceParser.js');
const helper = require('./helper.js');

const xpath = require('xpath');

let count=0;
const parseXML = (data,currObject,prefixes,source, iterator,options)=>{
    count=0;
    let doc=helper.readFileXML(source,options);
    return iterateDom(data,currObject,prefixes,iterator,doc,iterator,options);
};

const iterateDom = (data,currObject,prefixes,iterator,doc,nextIterator,options) =>{
    //check if it is a function
    if(currObject.functionValue) {
        let functionMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,currObject.functionValue['@id']),prefixes);
        let definition=functionHelper.findDefinition(data,functionMap.predicateObjectMap,prefixes);
        let parameters=functionHelper.findParameters(data,functionMap.predicateObjectMap,prefixes);
        let calcParameters=helper.calculateParameters(doc,parameters,'XPath');

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
    if(iterator===undefined){
        iteratorNodes = doc;
        if(!iteratorNodes.length){
            iteratorNodes=[iteratorNodes];
        }
    }else{
        iteratorNodes = xpath.select(iterator, doc);
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
        iteratorNodes.forEach(function(n,i){
            let obj={};
            count++;
            if(functionMap){
                //the subjectMapping contains a functionMapping
                let node=helper.cutArray(xpath.select('('+iterator+')'+'['+(i+1)+']',doc));
                type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'XPath');
            }
            let nodes=xpath.select('('+iterator+')'+'['+(i+1)+']'+'/'+reference,doc);
            nodes.forEach(function(node){
                if(type){
                    obj['@type']=type;
                }
                let temp;
                if(node.firstChild && node.firstChild.data){
                    temp=node.firstChild.data;
                }else if(node.nodeValue){
                    temp=node.nodeValue;
                }
                temp=helper.isURL(temp) ? temp :helper.addBase(temp,prefixes);
                if(temp.indexOf(' ') === -1){
                    obj['@id']=temp;
                    let p='('+iterator+')'+'['+(i+1)+']';
                    obj=doObjectMappings(currObject,data,p,prefixes,doc,obj,options);

                    if(!obj['@id']){
                        obj['@id']=currObject['@id']+'_'+count;
                    }
                    obj['$iter']=p;
                    obj['$ql']='XPath';
                    result.push(obj);
                }
            });
        });

    }else if (idTemplate){
        count++;
        iteratorNodes.forEach(function(n,i){
            let obj={};
            let p='('+iterator+')'+'['+(i+1)+']';
            let ids=calculateTemplate(doc,p,idTemplate,prefixes);
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
                    let node=helper.cutArray(xpath.select('('+iterator+')'+'['+(i+1)+']',doc));
                    type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'XPath');
                }
                obj['@id']=id;
                if(type){
                    obj['@type']=type;
                }
                obj=doObjectMappings(currObject,data,'('+iterator+')'+'['+(i+1)+']',prefixes,doc,obj,options);
                if(!obj['@id']){
                    obj['@id']=currObject['@id']+'_'+count;
                }
                obj['$iter']=p;
                obj['$ql']='XPath';
                result.push(obj);
            });
        });
    }else{
        //BlankNode with no template or id
        iteratorNodes.forEach(function(n,i){
            count++;
            if(functionMap){
                //the subjectMapping contains a functionMapping
                let node=helper.cutArray(xpath.select('('+iterator+')'+'['+(i+1)+']',doc));
                type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'XPath');
            }
            let p='('+iterator+')'+'['+(i+1)+']';
            let nodes=xpath.select(p,doc);
            let obj={};
            nodes.forEach(function(){
                if(constant){
                    obj['@id']=helper.getConstant(constant,prefixes);
                }
                if(type){
                    obj['@type']=type;
                }
                obj=doObjectMappings(currObject,data,'('+iterator+')'+'['+(i+1)+']',prefixes,doc,obj,options);
                if(!obj['@id']){
                    obj['@id']=currObject['@id']+'_'+count;
                }
                obj['$iter']=p;
                obj['$ql']='XPath';
                result.push(obj);
            });
        });
    }

    result=helper.cutArray(result);
    return result;
};

let doObjectMappings=(currObject,data,iterator,prefixes,doc,obj,options)=>{
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
                        predicate=helper.getConstant(predicate.constant,prefixes);
                    }
                }else{
                    throw('Error: no predicate specified!');
                }
            }
            if (Array.isArray(predicate)){
                for (let p of predicate){
                    handleSingleMapping(obj,mapping,p,prefixes,data,doc,iterator,options);
                }
            }else{
                handleSingleMapping(obj,mapping,predicate,prefixes,data,doc,iterator,options);
            }
        });
    }
    obj=helper.cutArray(obj);
    return obj;
};

/*
data: the data to insert
path: the actual jsonpath
predicate: the predicate to write to (obj[predicate]=data)
mapping: the actual mapping
prefixes: all prefixes
obj: the result object
doc:the whole file
 */


const handleSingleMapping = (obj,mapping,predicate,prefixes,data,doc,path,options)=>{
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
            let temp=calculateTemplate(doc,path,template,prefixes);
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
                        default:

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
            let arr = getData(path+'/'+reference,doc);
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
                    obj[predicate]=helper.addArray(obj[predicate]);
                    obj[predicate].push(iterateDom(data,nestedMapping,prefixes,nextsource.iterator,doc,options));
                }else{
                    obj[predicate]=iterateDom(data,nestedMapping,prefixes,nextsource.iterator,doc,options);
                }
            }else{
                if(!obj['$parentTriplesMap']){
                    obj['$parentTriplesMap']={};
                }
                let jc=undefined;
                if(objectmap['joinCondition']){
                    jc=objectmap['joinCondition']['@id'];
                }
                if(obj['$parentTriplesMap'][predicate]){
                    let temp=obj['$parentTriplesMap'][predicate];
                    obj['$parentTriplesMap'][predicate]=[];
                    obj['$parentTriplesMap'][predicate].push(temp);
                    obj['$parentTriplesMap'][predicate].push({
                        joinCondition:jc,
                        mapID:objectmap['@id']
                    })
                }else{
                    obj['$parentTriplesMap'][predicate]={
                        joinCondition:jc,
                        mapID:objectmap['@id']
                    }
                }
            }
        }
    }
};

const getData=(path,object)=>{
//make the xpath query
    let temp=xpath.select(path, object);
    let arr=[];
    temp.forEach(function(n){
        if(n.nodeValue){
            arr.push(n.nodeValue);
        }else{
            let children=n.childNodes;
            if(children){
                for (let i=0; i<children.length; i++){
                    let c=children[i];
                    if(c.data){
                        arr.push(c.data);
                    }
                }
            }
        }

    });
    if(arr.length>0){
        arr=helper.cutArray(arr);
        return arr;
    }else{
       return undefined;
    }
};


const calculateTemplate=(file,path,template,prefixes)=>{
    let beg=helper.locations('{',template);
    let end=helper.locations('}',template);
    let words=[];
    let toInsert=[];
    let templates=[];
    for (let i in beg){
        words.push(template.substr(beg[i]+1,end[i]-beg[i]-1));
    }
    words.forEach(function (w){
        let temp = helper.addArray(getData(path+'/'+w,file));
        toInsert.push(temp);
    });
    let allComb = helper.allPossibleCases(toInsert);
    for (let combin in allComb){
        let fin_temp=template;
        for(let found in allComb[combin]){
            fin_temp=fin_temp.replace('{'+words[found]+'}',helper.toURIComponent(allComb[combin][found]));
        }
        templates.push(fin_temp);
    }
    for (let t in templates){
        templates[t]=helper.replaceEscapedChar(prefixhelper.replacePrefixWithURL(templates[t],prefixes));
    }
    return templates;
};

module.exports.parseXML=parseXML;
module.exports.getData=getData;