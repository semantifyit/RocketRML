let assert = require('assert');

const parser = require('../index.js');
const prefixhelper = require('../helper/prefixHelper.js');

let prefixes={
    rr: 'http://www.w3.org/ns/r2rml#',
    ex: 'http://example.com/',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    rml: 'http://semweb.mmlab.be/ns/rml#',
    activity: 'http://example.com/activity/',
    schema: 'http://schema.org/',
    ql: 'http://semweb.mmlab.be/ns/ql#',
    feratel: 'http://www.feratel.at/event/',
    fnml: 'http://semweb.mmlab.be/ns/fnml#',
    fno: 'http://w3id.org/function/ontology#',
    grel: 'http://users.ugent.be/~bjdmeest/function/grel.ttl#',
    prefix: 'http://mytestprefix.org/',
    sti: 'http://sti2.at#'
};
//TESTS FOR JSON


it('Basic straight mapping', async function(){
    let options={
        baseMapping:"http://sti2.at/#Mapping",
    };
    let result = await parser.parseFile('./tests/straightMapping/mapping.ttl', './tests/straightMapping/out.json',options).catch((err) => { console.log(err); });
    console.log(result);
    assert.equal(result['http://schema.org/name'], "Tom A.");
    assert.equal(result['http://schema.org/age'], 15);
    assert.equal(result['@type'], 'http://schema.org/Person');
    assert.equal(Object.keys(result).length, 3);
});

it('Basic straight double mapping', async function(){
    let result = await parser.parseFile('./tests/straightDoubleMapping/mapping.ttl', './tests/straightDoubleMapping/out.json').catch((err) => { console.log(err); });
    assert.equal(result.length,2);
});

it('Nested mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/nestedMapping/mapping.ttl', './tests/nestedMapping/out.json',options).catch((err) => { console.log(err); });
    assert.equal(result['http://mytestprefix.org/likesSports']['http://mytestprefix.org/name'][0], 'Tennis');
    assert.equal(result['http://mytestprefix.org/likesSports']['http://mytestprefix.org/name'][1], 'Football');
});


it('Test with deleting prefixes', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/straightMapping/mapping.ttl', './tests/straightMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result['name'], "Tom A.");
    assert.equal(result['age'], 15);
    assert.equal(result['@type'], 'Person');
    assert.equal(Object.keys(result).length, 3);
});

it('Basic straight mapping with array of input', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/straightMappingArray/mapping.ttl', './tests/straightMappingArray/out.json',options).catch((err) => { console.log(err); });
    assert.equal(result[0]['http://schema.org/name'], "Ben A.");
    assert.equal(result[0]['http://schema.org/age'], 15);
    assert.equal(result[0]['@type'], 'http://schema.org/Person');
    assert.equal(result[1]['http://schema.org/name'], "Tom B.");
    assert.equal(result[1]['http://schema.org/age'], 16);
    assert.equal(result[1]['@type'], 'http://schema.org/Person');
    assert.equal(Object.keys(result).length, 2);
});

it('Nested mapping with array of input', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/nestedMappingArray/mapping.ttl', './tests/nestedMappingArray/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result[0]['name'], "Ben A.");
    assert.equal(result[0].likesSports.name[0], "Tennis");
    assert.equal(result[0].likesSports.name[1], "Football");
    assert.equal(result[1]['name'], "Tom B.");
    assert.equal(result[1].likesSports.name[0], "Soccer");
    assert.equal(result[1].likesSports.name[1], "Baseball");
    assert.equal(Object.keys(result).length, 2);
});

it('Double-nested mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/doubleNestedMapping/mapping.ttl', './tests/doubleNestedMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result['name'], "Tom A.");
    assert.equal(result['age'], "15");
    assert.equal(result['@type'], "Person");
    let likesSport=result['likesSports'];
    assert.equal(likesSport.name, "Basketball");
    assert.equal(likesSport['requires']['thing'][0], "ball");
    assert.equal(likesSport['requires']['thing'][1], "basket");
});

it('Function mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/functionMapping/mapping.ttl', './tests/functionMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    let testString='Tom A.likes the sports: Tennis and Football';
    assert.equal(result.likesSports.description, testString);
});

it('Function subject mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/functionSubjectMapping/mapping.ttl', './tests/functionSubjectMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result["@type"], "Animal");
});

it('Function http mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/httpMapping/mapping.ttl', './tests/httpMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result.likesSports.description, "delectus aut autem");
});

it('Function http mapping post', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/httpMappingBody/mapping.ttl', './tests/httpMappingBody/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result.likesSports.loginToken, "QpwL5tke4Pnpja7X");
});

it('Predefined function mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/predefinedFunctionMapping/mapping.ttl', './tests/predefinedFunctionMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    let testString='TOM A.';
    assert.equal(result.name, testString);
});

it('Predefined option parameter function mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
        functions: {
            'http://users.ugent.be/~bjdmeest/function/grel.ttl#toLowerCase': function (data) {
                return data.toString().toLowerCase();
            }
        }
    };
    let result = await parser.parseFile('./tests/optionParameterFunctionMapping/mapping.ttl', './tests/optionParameterFunctionMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    let testString='tom a.';
    assert.equal(result.name, testString);
});

it('Triple nested mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/tripleNestedMapping/mapping.ttl', './tests/tripleNestedMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result[0].name, "Tom A.");
    assert.equal(result[1].name, "Tom B.");

    assert.equal(result[0].likesSports.name, "Basketball");
    assert.equal(result[1].likesSports.name, "Football");

    assert.equal(result[0].likesSports.requires[0].thing, "ball");
    assert.equal(result[1].likesSports.requires.thing, "ball");
});

it('Iterator extension mapping', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/extendedIteratorMapping/mapping.ttl', './tests/extendedIteratorMapping/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    let testString='Tom A.';
    let s1='Basketball';
    let s2='Baseball';
    let req1=[ 'ball', 'basket' ];
    let req2=[ 'ball', 'baseball bat' ];
    assert.equal(result.name, testString);

    assert.equal(result.likesSports[0].name, s1);
    assert.equal(result.likesSports[0].requires.thing[0], req1[0]);
    assert.equal(result.likesSports[0].requires.thing[1], req1[1]);

    assert.equal(result.likesSports[1].name, s2);
    assert.equal(result.likesSports[1].requires.thing[0], req2[0]);
    assert.equal(result.likesSports[1].requires.thing[1], req2[1]);

});

it('Replace mapping', async function(){
    let options= {
        compress: {
            '@vocab': "http://mytestprefix.org/"
        },
        baseMapping:["http://sti2.at/#Mapping","http://sti2.at/#CLASSIFIERMapping"],
        insert:{
            baseEntry:0 //First element in array is used as output
        }
    };
    let result = await parser.parseFile('./tests/replaceMapping/mapping.ttl', './tests/replaceMapping/out.json',options).catch((err) => { console.log(err); });
    console.log(result);
    let testString='Tom A.';
    let s1='Tennis';
    let s2='Football';
    assert.equal(result.name, testString);
    assert.equal(result.likesSports.sports[0], s1);
    assert.equal(result.likesSports.sports[1], s2);
});


//TESTS FOR XML

it('Basic straight mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/straightMappingXML/mapping.ttl', './tests/straightMappingXML/out.json',options).catch((err) => { console.log(err); });
    assert.equal(result['http://schema.org/name'], "Tom A.");
    assert.equal(result['http://schema.org/age'], 15);
    assert.equal(result['@type'], 'http://schema.org/Person');
    assert.equal(Object.keys(result).length, 3);
});

it('Basic straight double mapping XML', async function(){
    let result = await parser.parseFile('./tests/straightDoubleMappingXML/mapping.ttl', './tests/straightDoubleMappingXML/out.json').catch((err) => { console.log(err); });
    assert.equal(result.length,2);
});

it('Nested mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/nestedMappingXML/mapping.ttl', './tests/nestedMappingXML/out.json',options).catch((err) => { console.log(err); });
    assert.equal(result['http://mytestprefix.org/likesSports']['http://mytestprefix.org/name'][1], 'Tennis');
    assert.equal(result['http://mytestprefix.org/likesSports']['http://mytestprefix.org/name'][0], 'Football');
});


it('Test with deleting prefixes XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/straightMappingXML/mapping.ttl', './tests/straightMappingXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result['name'], "Tom A.");
    assert.equal(result['age'], 15);
    assert.equal(result['@type'], 'Person');
    assert.equal(Object.keys(result).length, 3);
});

it('Basic straight mapping with array of input XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/straightMappingArrayXML/mapping.ttl', './tests/straightMappingArrayXML/out.json',options).catch((err) => { console.log(err); });
    assert.equal(result[0]['http://schema.org/name'], "Ben A.");
    assert.equal(result[0]['http://schema.org/age'], 15);
    assert.equal(result[0]['@type'], 'http://schema.org/Person');
    assert.equal(result[1]['http://schema.org/name'], "Tom B.");
    assert.equal(result[1]['http://schema.org/age'], 16);
    assert.equal(result[1]['@type'], 'http://schema.org/Person');
    assert.equal(Object.keys(result).length, 2);
});

it('Nested mapping with array of input XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/nestedMappingArrayXML/mapping.ttl', './tests/nestedMappingArrayXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result[0]['name'], "Ben A.");
    assert.equal(result[0].likesSports.name[1], "Tennis");
    assert.equal(result[0].likesSports.name[0], "Football");
    assert.equal(result[1]['name'], "Tom B.");
    assert.equal(result[1].likesSports.name[1], "Soccer");
    assert.equal(result[1].likesSports.name[0], "Baseball");
    assert.equal(Object.keys(result).length, 2);
});


it('Double-nested mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/doubleNestedMappingXML/mapping.ttl', './tests/doubleNestedMappingXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result['name'], "Tom A.");
    assert.equal(result['age'], "15");
    assert.equal(result['@type'], "Person");
    let likesSport=result['likesSports'];
    assert.equal(likesSport.name, "Basketball");
    assert.equal(likesSport['requires']['thing'][0], "ball");
    assert.equal(likesSport['requires']['thing'][1], "basket");
});

it('Function mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/functionMappingXML/mapping.ttl', './tests/functionMappingXML/out.json',options).catch((err) => { console.log(err); });
    let testString='Tom A.likes the sports: Football and Tennis';
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result.likesSports.description, testString);
});

it('Function subject mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/functionSubjectMappingXML/mapping.ttl', './tests/functionSubjectMappingXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result["@type"], "Animal");
});

it('subject mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/subjectMappingXML/mapping.ttl', './tests/subjectMappingXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result["@id"], "Tiger");
});

it('Iterator extension mapping xml', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/extendedIteratorMappingXML/mapping.ttl', './tests/extendedIteratorMappingXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    console.log(result);
    let testString='Tom A.';
    let s1='Basketball';
    let s2='Baseball';
    let req1=[ 'ball', 'basket' ];
    let req2=[ 'ball', 'baseball bat' ];
    assert.equal(result.name, testString);

    assert.equal(result.likesSports[0].name, s1);
    assert.equal(result.likesSports[0].requires.thing[0], req1[0]);
    assert.equal(result.likesSports[0].requires.thing[1], req1[1]);

    assert.equal(result.likesSports[1].name, s2);
    assert.equal(result.likesSports[1].requires.thing[0], req2[0]);
    assert.equal(result.likesSports[1].requires.thing[1], req2[1]);

});

it('Compacting test', async function(){
    let options= {
        baseMapping:["http://sti2.at/#Mapping"],
        compress: {
            '@vocab': "http://mytestprefix.org/"
        }
    };
    let result = await parser.parseFile('./tests/extendedIteratorMappingXML/mapping.ttl', './tests/extendedIteratorMappingXML/out.json',options).catch((err) => { console.log(err); });
    let testString='Tom A.';
    let s1='Basketball';
    let s2='Baseball';
    let req1=[ 'ball', 'basket' ];
    let req2=[ 'ball', 'baseball bat' ];
    assert.equal(result.name, testString);

    assert.equal(result.likesSports[0].name, s1);
    assert.equal(result.likesSports[0].requires.thing[0], req1[0]);
    assert.equal(result.likesSports[0].requires.thing[1], req1[1]);

    assert.equal(result.likesSports[1].name, s2);
    assert.equal(result.likesSports[1].requires.thing[0], req2[0]);
    assert.equal(result.likesSports[1].requires.thing[1], req2[1]);

});

it('Triple nested mapping XML', async function(){
    let options={
        baseMapping:["http://sti2.at/#Mapping"],
    };
    let result = await parser.parseFile('./tests/tripleNestedMappingXML/mapping.ttl', './tests/tripleNestedMappingXML/out.json',options).catch((err) => { console.log(err); });
    result=prefixhelper.deleteAllPrefixesFromObject(result,prefixes);
    assert.equal(result[0].name, "Tom A.");
    assert.equal(result[1].name, "Tom B.");

    assert.equal(result[0].likesSports.name, "Basketball");
    assert.equal(result[1].likesSports.name, "Football");

    assert.equal(result[0].likesSports.requires[0].thing, "ball");
    assert.equal(result[1].likesSports.requires.thing, "ball");
});
