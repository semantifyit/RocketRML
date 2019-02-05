const N3 = require('n3');
const jsonld = require('jsonld');

const quadsToJsonLD = async (nquads, context) => {
    let doc = await jsonld.fromRDF(nquads, {format: 'application/n-quads'});
    doc = await jsonld.compact(doc, context);
    return doc;
};

const ttlToJson = (ttl) =>
    new Promise((resolve, reject) => {
        const parser = new N3.Parser();
        const writer = N3.Writer({ format: 'N-Triples' });
        parser.parse(ttl,
            (error, quad, prefixes) => {
                if (error) {
                    reject(error);
                }
                else if (quad){
                    writer.addQuad(quad);
                }
                else {
                    writer.end((error, result) => {
                        nquads = result;
                        resolve(quadsToJsonLD(result, prefixes));
                    });
                }
            });
    });

function isBlankNode(id) {
    return id.startsWith("_:");
}

function hasLogicalSource(e) {
    return Object.keys(e).find(x=>x.match(/.*logicalSource/));
}
function hasSubjectMap(e) {
    return Object.keys(e).find(x=>x.match(/.*subjectMap/));
}


function getBaseMappings(graphArray,options) {
    if(options && options.baseMapping){
        if(!Array.isArray(options.baseMapping)){
            options.baseMapping=[options.baseMapping];
        }
        let result=[];
        for (let bs of options.baseMapping){
            result.push(bs)
        }
        console.log('baseMapping found: '+ result);
        for(let m in result){
            if(!graphArray[m]){
                throw ("getBaseMappings(): baseMapping "+m+" does not exist!");
            }
        }

        return result;
    }else{
        return undefined;
    }

}


const getTopLevelMappings = (graphArray,options)=>{
    let toplevelMappings=[];
    if(!graphArray.length){
        //graphArray is not an array
        throw('getTopLevelMappings(): Error during processing mapfile: not an array as input!');
    }
    let baseSource=getBaseMappings(graphArray,options);
    if(baseSource){  //if baseSource defined, only return this one
        return baseSource;
    }
    graphArray.forEach(function(e){
        let id=e['@id'];
        if(hasLogicalSource(e) && hasSubjectMap(e)){
            toplevelMappings.push(id);
        }
    });
    if(graphArray.length===0){
        //mapfile does not contain any toplevel mappings
        throw('getTopLevelMappings(): Error during processing mapfile: no toplevel found! (only blank nodes)');
    }
    return toplevelMappings;
};

//returns object with prefixes, graph, and all top-level mappings
const expandedJsonMap = async (ttl,options) => {
    let response = await ttlToJson(ttl);
    let result={};
    result.prefixes=response['@context'];
    result.data=response['@graph'];
    result.topLevelMappings=getTopLevelMappings(response['@graph'],options);
    return result;
};

module.exports.ttlToJson=ttlToJson;
module.exports.expandedJsonMap=expandedJsonMap;