const mapfile = require('./mapfile/mapfileParser.js');
const inputparser = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const objectHelper = require('./helper/objectHelper.js');
const prefixhelper = require('./helper/prefixHelper.js');
const replace = require('./helper/replace.js');
const start = require('./index.js');

const fs = require('fs');

const pathThueris='./examples/mapping.ttl';
const pathBrandenburg='./examples/mappingB.ttl';
const pathOUTBrandenburg='./examples/outB.json';
const pathOUTThueris='./examples/out.json';

let options={
   // compress: {
    //    '@vocab':"http://schema.org/"
    //},
    replace:{
        baseEntry:0 //First element in array is used as output
    },
    //baseMapping:['rlb:#Mapping','rlb:#PHOTOMapping'],
    baseMapping:['rlb:#Mapping','rlb:#PHOTOMapping'],
    removeNameSpace:{xmlns:"https://backoffice.reiseland-brandenburg.de/rpcServer/Api/xml"}
};

const temp='./examples/outB.json';

/*start.parseFile(pathBrandenburg, pathOUTBrandenburg,options).then(function(result){
        console.log('SUCCESS');
        //console.log(result);
    },
    function(err){
        console.log('ERROR');
        console.log(err);
    });*/

let mapping='@prefix rr: <http://www.w3.org/ns/r2rml#>.\n' +
    '@prefix rml: <http://semweb.mmlab.be/ns/rml#>.\n' +
    '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n' +
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n' +
    '@prefix ql: <http://semweb.mmlab.be/ns/ql#>.\n' +
    '@prefix map: <http://example.com/base#>.\n' +
    '\n' +
    'map:map_emit_0 rml:logicalSource map:source_0;\n' +
    '    a rr:TriplesMap;\n' +
    '    rdfs:label "emit";\n' +
    '    rr:subjectMap map:s_1;\n' +
    '    rr:predicateObjectMap map:pom_5, map:pom_6, map:pom_7, map:pom_8.\n' +
    '\n' +
    '\n' +
    '\n' +
    'map:om_10 a rr:ObjectMap;\n' +
    '    rr:constant "http://coca-cola.com/#me";\n' +
    '    rr:termType rr:IRI.\n' +
    'map:om_11 a rr:ObjectMap;\n' +
    '    rml:reference "created_time";\n' +
    '    rr:termType rr:Literal.\n' +
    'map:om_8 a rr:ObjectMap;\n' +
    '    rr:constant "http://www.w3.org/ns/prov#Activity";\n' +
    '    rr:termType rr:IRI.\n' +
    'map:om_9 a rr:ObjectMap;\n' +
    '    rr:constant "http://semweb.datasciencelab.be/ns/prov-said/EmitMessage";\n' +
    '    rr:termType rr:IRI.\n' +
    '\n' +
    '\n' +
    'map:pm_10 a rr:PredicateMap;\n' +
    '    rr:constant <http://www.w3.org/ns/prov#endedAtTime>.\n' +
    'map:pm_6 a rr:PredicateMap;\n' +
    '    rr:constant rdf:type.\n' +
    'map:pm_7 a rr:PredicateMap;\n' +
    '    rr:constant <http://www.w3.org/ns/prov#type>.\n' +
    'map:pm_8 a rr:PredicateMap;\n' +
    '    rr:constant <http://www.w3.org/ns/prov#wasStartedBy>.\n' +
    'map:pm_9 a rr:PredicateMap;\n' +
    '    rr:constant <http://www.w3.org/ns/prov#startedAtTime>.\n' +
    '\n' +
    'map:pom_5 a rr:PredicateObjectMap;\n' +
    '    rr:predicateMap map:pm_6;\n' +
    '    rr:objectMap map:om_8.\n' +
    'map:pom_6 a rr:PredicateObjectMap;\n' +
    '    rr:predicateMap map:pm_7;\n' +
    '    rr:objectMap map:om_9.\n' +
    'map:pom_7 a rr:PredicateObjectMap;\n' +
    '    rr:predicateMap map:pm_8;\n' +
    '    rr:objectMap map:om_10.\n' +
    'map:pom_8 a rr:PredicateObjectMap;\n' +
    '    rr:predicateMap map:pm_9, map:pm_10;\n' +
    '    rr:objectMap map:om_11.\n' +
    '\n' +
    '\n' +
    'map:s_1 a rr:SubjectMap;\n' +
    '    rr:template "http://coca-cola.com/emit/{id}".\n' +
    'map:source_0 a rml:LogicalSource;\n' +
    '    rdfs:label "api";\n' +
    '    rml:source "input";\n' +
    '    rml:iterator "$.data[*]";\n' +
    '    rml:referenceFormulation ql:JSONPath.\n';


let input='{\n' +
    '    "data": [\n' +
    '        {\n' +
    '            "created_time": "2018-11-21T01:12:24+0000",\n' +
    '            "message": "What’s the one thing that never fails to make you smile? 😀 #RefreshTheFee",\n' +
    '            "id": "820882001277849_313056145953449",\n' +
    '            "permalink_url": "https://www.facebook.com/CocaColaUnitedStates/videos/313056145953449/"\n' +
    '        },\n' +
    '        {\n' +
    '            "created_time": "2018-11-13T01:03:11+0000",\n' +
    '            "message": "This #WorldKindnessDay, we’re spreading a little love and positivity. ➡️ to 😃. #RefreshTheFeed",\n' +
    '            "id": "820882001277849_2242864155746286",\n' +
    '            "permalink_url": "https://www.facebook.com/CocaColaUnitedStates/posts/2242864155746286"\n' +
    '        },\n' +
    '        {\n' +
    '            "created_time": "2018-11-13T01:02:00+0000",\n' +
    '            "message": "Spread kindness. Share the ❤️️. #WorldKindnessDay #RefreshTheFeed",\n' +
    '            "id": "820882001277849_2169022539814557",\n' +
    '            "permalink_url": "https://www.facebook.com/CocaColaUnitedStates/videos/2169022539814557/"\n' +
    '        }\n' +
    '    ]\n' +
    '}'




start.parseFileLive(mapping, {'input':input},{}).then(function(result){ //or only string for vocab
        console.log('SUCCESS');
        console.log(result);
    },
    function(err){
        console.log('ERROR');
        console.log(err);
    });
