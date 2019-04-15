const assert = require('assert');

const parser = require('../index.js');
const prefixhelper = require('../helper/prefixHelper.js');
const helper = require('../input-parser/helper.js');
const objectHelper = require('../helper/objectHelper.js');

const prefixes = {
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
  sti: 'http://sti2.at#',
};
// TESTS FOR JSON


it('Basic straight mapping', async () => {
  const options = {};
  let result = await parser.parseFile('./tests/straightMapping/mapping.ttl', './tests/straightMapping/out.json', options).catch((err) => { console.log(err); });
  result = helper.cutArray(result);
  console.log(result);
  assert.equal(result['http://schema.org/name'], 'Tom A.');
  assert.equal(result['http://schema.org/age'], 15);
  assert.equal(result['@type'], 'http://schema.org/Person');
  assert.equal(Object.keys(result).length, 4);
});

it('Basic straight double mapping', async () => {
  const result = await parser.parseFile('./tests/straightDoubleMapping/mapping.ttl', './tests/straightDoubleMapping/out.json').catch((err) => { console.log(err); });
  console.log(result);
  assert.equal(result.length, 2);
});

it('Live mapping', async () => {
  const options = {
    //  baseMapping:["http://sti2.at/#SPORTSmapping"],
  };
  const mapFile = '@prefix rr: <http://www.w3.org/ns/r2rml#> .\n'
        + '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n'
        + '@prefix rml: <http://semweb.mmlab.be/ns/rml#> .\n'
        + '@prefix prefix: <http://mytestprefix.org/> .\n'
        + '@prefix ql: <http://semweb.mmlab.be/ns/ql#> .\n'
        + '@base <http://sti2.at/> . #the base for the classes\n'
        + '\n'
        + '\n'
        + '<#LOGICALSOURCE>\n'
        + 'rml:source "./input.json";\n'
        + 'rml:referenceFormulation ql:JSONPath;\n'
        + 'rml:iterator "$.*".\n'
        + '\n'
        + '<#SPORTSSOURCE>\n'
        + 'rml:source "./input.json";\n'
        + 'rml:referenceFormulation ql:JSONPath;\n'
        + 'rml:iterator "$.*.sports.School.*".\n'
        + '\n'
        + '<#REQUIRESSOURCE>\n'
        + 'rml:source "./input.json";\n'
        + 'rml:referenceFormulation ql:JSONPath;\n'
        + 'rml:iterator "$.*.sports.School.*.requires.*".\n'
        + '\n'
        + '\n'
        + '<#Mapping>\n'
        + 'rml:logicalSource <#LOGICALSOURCE>;\n'
        + '\n'
        + ' rr:subjectMap [\n'
        + '    rr:termType rr:BlankNode;\n'
        + '    rr:class prefix:Person;\n'
        + ' ];\n'
        + '\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:name;\n'
        + '    rr:objectMap [ rml:reference "name" ];\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:age;\n'
        + '    rr:objectMap [ rml:reference "age" ];\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:likesSports;\n'
        + '    rr:objectMap  [\n'
        + '           rr:parentTriplesMap <#SPORTSmapping>;\n'
                    + 'rr:joinCondition [\n'
                        + 'rr:child "name" ;\n'
                        + 'rr:parent "^^^.name";\n'
                    + ']\n'
        + '        ];\n'
        + '].\n'
        + '\n'
        + '<#SPORTSmapping>\n'
        + 'rml:logicalSource <#SPORTSSOURCE>;\n'
        + '\n'
        + ' rr:subjectMap [\n'
        + '    rr:termType rr:BlankNode;\n'
        + '    rr:class prefix:Sport;\n'
        + ' ];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:name;\n'
        + '    rr:objectMap [ rml:reference "name" ];\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:requires;\n'
        + '    rr:objectMap  [\n'
        + '           rr:parentTriplesMap <#REQmapping>;\n'
                        + 'rr:joinCondition [\n'
                        + 'rr:child "name" ;\n'
                        + 'rr:parent "^^.name";\n'
        + ']\n'
        + '        ];\n'
        + '].\n'
        + '\n'
        + '<#REQmapping>\n'
        + 'rml:logicalSource <#REQUIRESSOURCE>;\n'
        + 'rr:subjectMap [\n'
        + '    rr:termType rr:BlankNode;\n'
        + '    rr:class prefix:Requirement;\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:thing;\n'
        + '    rr:objectMap [ rml:reference "thing" ];\n'
        + '].\n'
        + '\n'
        + '\n'
        + '\n'
        + '\n'
        + '\n'
        + '\n';
  const inputFiles = {
    './input.json': '[\n'
            + '  {\n'
            + '    "name": "Tom A.",\n'
            + '    "age": 15,\n'
            + '    "sports": {\n'
            + '      "School":\n'
            + '      [\n'
            + '        {\n'
            + '          "name": "Basketball",\n'
            + '          "requires": [\n'
            + '            {\n'
            + '              "thing":"ball"\n'
            + '            },{\n'
            + '              "thing":"basket"\n'
            + '            }\n'
            + '          ]\n'
            + '        }\n'
            + '      ]\n'
            + '    }\n'
            + '  },\n'
            + '  {\n'
            + '    "name": "Tom B.",\n'
            + '    "age": 16,\n'
            + '    "sports": {\n'
            + '      "School":\n'
            + '      [\n'
            + '        {\n'
            + '          "name": "Football",\n'
            + '          "requires": [\n'
            + '            {\n'
            + '              "thing":"ball"\n'
            + '            }\n'
            + '          ]\n'
            + '        }\n'
            + '      ]\n'
            + '    }\n'
            + '  }\n'
            + ']',
  };
  let result = await parser.parseFileLive(mapFile, inputFiles, options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Tom A.');
  assert.equal(result[1].name, 'Tom B.');

  assert.equal(result[5].name, 'Basketball');
  assert.equal(result[6].name, 'Football');

  assert.equal(result[5].requires.length, 2);
  assert.equal(result[6].requires['@id'], '_:http%3A%2F%2Fsti2.at%2F%23REQmapping_3');
});

it('Nested mapping', async () => {
  const options = {
  };
  const result = await parser.parseFile('./tests/nestedMapping/mapping.ttl', './tests/nestedMapping/out.json', options).catch((err) => { console.log(err); });
  console.log(result);
  assert.equal(result[0]['http://mytestprefix.org/likesSports']['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_1');
  assert.equal(result[1]['http://mytestprefix.org/name'][1], 'Football');
});


it('Test with deleting prefixes', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/straightMapping/mapping.ttl', './tests/straightMapping/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  result = result[0];
  assert.equal(result.name, 'Tom A.');
  assert.equal(result.age, 15);
  assert.equal(result['@type'], 'Person');
  assert.equal(Object.keys(result).length, 4);
});

it('Basic straight mapping with array of input', async () => {
  const options = {
  };
  const result = await parser.parseFile('./tests/straightMappingArray/mapping.ttl', './tests/straightMappingArray/out.json', options).catch((err) => { console.log(err); });
  console.log(result);
  assert.equal(result[0]['http://schema.org/name'], 'Ben A.');
  assert.equal(result[0]['http://schema.org/age'], 15);
  assert.equal(result[0]['@type'], 'http://schema.org/Person');
  assert.equal(result[1]['http://schema.org/name'], 'Tom B.');
  assert.equal(result[1]['http://schema.org/age'], 16);
  assert.equal(result[1]['@type'], 'http://schema.org/Person');
  assert.equal(Object.keys(result).length, 2);
});

it('Nested mapping with array of input', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/nestedMappingArray/mapping.ttl', './tests/nestedMappingArray/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Ben A.');
  assert.equal(result[0].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_1');
  assert.equal(result[1].name, 'Tom B.');
  assert.equal(result[1].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_2');
  assert.equal(Object.keys(result).length, 4);
});

it('Double-nested mapping', async () => {
  const options = {
    compress: {
      '@vocab': 'http://mytestprefix.org/',
    },
    language: 'de',
  };
  let result = await parser.parseFile('./tests/doubleNestedMapping/mapping.ttl', './tests/doubleNestedMapping/out.json', options).catch((err) => { console.log(err); });
  console.log(result);
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  assert.equal(result[0].name, 'Tom A.');
  assert.equal(result[0].age, '15');
  assert.equal(result[0]['@type'], 'Person');
  let likesSport = result[0].likesSports['@id'];
  likesSport = objectHelper.findIdinObjArr(result, likesSport);
  assert.equal(likesSport.name, 'Basketball');
  assert.equal(likesSport.requires['@id'], '_:http%3A%2F%2Fsti2.at%2F%23REQmapping_1');
});

it('Function mapping', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/functionMapping/mapping.ttl', './tests/functionMapping/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  const testString = 'Tom A.likes the sports: Tennis and Football';
  assert.equal(result[1].description, testString);
});

it('Function subject mapping', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/functionSubjectMapping/mapping.ttl', './tests/functionSubjectMapping/out.json', options).catch((err) => { console.log(err); });
  console.log(result);
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  assert.equal(result[0]['@type'], 'Animal');
});

// takes forever, maybe server down?
/*
it('Function http mapping', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/httpMapping/mapping.ttl', './tests/httpMapping/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[1].description, 'delectus aut autem');
});


it('Function http mapping post', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/httpMappingBody/mapping.ttl', './tests/httpMappingBody/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[1].loginToken, 'QpwL5tke4Pnpja7X');
});
*/
it('Predefined function mapping', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/predefinedFunctionMapping/mapping.ttl', './tests/predefinedFunctionMapping/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  const testString = 'TOM A.';
  assert.equal(result[0].name, testString);
});

it('Predefined option parameter function mapping', async () => {
  const options = {
    functions: {
      'http://users.ugent.be/~bjdmeest/function/grel.ttl#toLowerCase': function (data) {
        return data.toString().toLowerCase();
      },
    },
  };
  let result = await parser.parseFile('./tests/optionParameterFunctionMapping/mapping.ttl', './tests/optionParameterFunctionMapping/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  const testString = 'tom a.';
  assert.equal(result[0].name, testString);
});

it('Triple nested mapping', async () => {
  const options = {
    // replace: true,
  };
  let result = await parser.parseFile('./tests/tripleNestedMapping/mapping.ttl', './tests/tripleNestedMapping/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Tom A.');
  assert.equal(result[1].name, 'Tom B.');

  assert.equal(Object.keys(result[0].likesSports).length, 1);
  assert.equal(Object.keys(result[1].likesSports).length, 1);

  assert.equal(result[5].requires.length, 2);
  assert.equal(result[6].requires['@id'], '_:http%3A%2F%2Fsti2.at%2F%23REQmapping_3');
});

// TESTS FOR XML

it('Basic straight mapping XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/straightMappingXML/mapping.ttl', './tests/straightMappingXML/out.json', options).catch((err) => { console.log(err); });
  console.log(result);
  result = result[0];
  assert.equal(result['http://schema.org/name'], 'Tom A.');
  assert.equal(result['http://schema.org/age'], 15);
  assert.equal(result['@type'], 'http://schema.org/Person');
  assert.equal(Object.keys(result).length, 4);
});

it('Basic straight double mapping XML', async () => {
  const result = await parser.parseFile('./tests/straightDoubleMappingXML/mapping.ttl', './tests/straightDoubleMappingXML/out.json').catch((err) => { console.log(err); });
  assert.equal(result.length, 2);
});

it('Nested mapping XML', async () => {
  const options = {
  };
  const result = await parser.parseFile('./tests/nestedMappingXML/mapping.ttl', './tests/nestedMappingXML/out.json', options).catch((err) => { console.log(err); });
  console.log(result);
  assert.equal(result[0]['http://mytestprefix.org/likesSports']['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_1');
});


it('Test with deleting prefixes XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/straightMappingXML/mapping.ttl', './tests/straightMappingXML/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  result = result[0];
  assert.equal(result.name, 'Tom A.');
  assert.equal(result.age, 15);
  assert.equal(result['@type'], 'Person');
  assert.equal(Object.keys(result).length, 4);
});

it('Basic straight mapping with array of input XML', async () => {
  const options = {
  };
  const result = await parser.parseFile('./tests/straightMappingArrayXML/mapping.ttl', './tests/straightMappingArrayXML/out.json', options).catch((err) => { console.log(err); });
  assert.equal(result[0]['http://schema.org/name'], 'Ben A.');
  assert.equal(result[0]['http://schema.org/age'], 15);
  assert.equal(result[0]['@type'], 'http://schema.org/Person');
  assert.equal(result[1]['http://schema.org/name'], 'Tom B.');
  assert.equal(result[1]['http://schema.org/age'], 16);
  assert.equal(result[1]['@type'], 'http://schema.org/Person');
  assert.equal(Object.keys(result).length, 2);
});

it('Nested mapping with array of input XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/nestedMappingArrayXML/mapping.ttl', './tests/nestedMappingArrayXML/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Ben A.');
  assert.equal(result[0].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_1');
  assert.equal(result[1].name, 'Tom B.');
  assert.equal(result[1].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_2');
  assert.equal(Object.keys(result).length, 4);
});


it('Double-nested mapping XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/doubleNestedMappingXML/mapping.ttl', './tests/doubleNestedMappingXML/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Tom A.');
  assert.equal(result[0].age, '15');
  assert.equal(result[0]['@type'], 'Person');
  let likesSport = result[0].likesSports['@id'];
  likesSport = objectHelper.findIdinObjArr(result, likesSport);
  assert.equal(likesSport.name, 'Basketball');
  assert.equal(likesSport.requires['@id'], '_:http%3A%2F%2Fsti2.at%2F%23REQmapping_1');
});


it('Function mapping XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/functionMappingXML/mapping.ttl', './tests/functionMappingXML/out.json', options).catch((err) => { console.log(err); });
  const testString = 'Tom A.likes the sports: Football and Tennis';
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[1].description, testString);
});

it('Function subject mapping XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/functionSubjectMappingXML/mapping.ttl', './tests/functionSubjectMappingXML/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0]['@type'], 'Animal');
});

it('subject mapping XML', async () => {
  const options = {
  };
  let result = await parser.parseFile('./tests/subjectMappingXML/mapping.ttl', './tests/subjectMappingXML/out.json', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0]['@id'], 'Tiger');
});

it('Triple nested mapping XML', async () => {
  const options = {
    xmlPerformanceMode: true,
  };
  let result = await parser.parseFile('./tests/tripleNestedMappingXML/mapping.ttl', './tests/tripleNestedMappingXML/out.json', options).catch((err) => { console.log(err); });
  console.log(result)
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Tom A.');
  assert.equal(result[1].name, 'Tom B.');

  assert.equal(result[0].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_1');
  assert.equal(result[1].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_2');

  assert.equal(result[5].requires.length, 2);
});

it('Live mapping XML', async () => {
  const options = {
  };

  const mapFile = '@prefix rr: <http://www.w3.org/ns/r2rml#> .\n'
        + '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n'
        + '@prefix rml: <http://semweb.mmlab.be/ns/rml#> .\n'
        + '@prefix prefix: <http://mytestprefix.org/> .\n'
        + '@prefix ql: <http://semweb.mmlab.be/ns/ql#> .\n'
        + '@base <http://sti2.at/> . #the base for the classes\n'
        + '\n'
        + '\n'
        + '<#LOGICALSOURCE>\n'
        + 'rml:source "./input.xml";\n'
        + 'rml:referenceFormulation ql:XPath;\n'
        + 'rml:iterator "/root/*".\n'
        + '\n'
        + '<#SPORTSSOURCE>\n'
        + 'rml:source "./input.xml";\n'
        + 'rml:referenceFormulation ql:XPath;\n'
        + 'rml:iterator "/root/*/sports/School/*".\n'
        + '\n'
        + '<#REQUIRESSOURCE>\n'
        + 'rml:source "./input.xml";\n'
        + 'rml:referenceFormulation ql:XPath;\n'
        + 'rml:iterator "/root/*/sports/School/*/requires/*".\n'
        + '\n'
        + '\n'
        + '<#Mapping>\n'
        + 'rml:logicalSource <#LOGICALSOURCE>;\n'
        + '\n'
        + ' rr:subjectMap [\n'
        + '    rr:termType rr:BlankNode;\n'
        + '    rr:class prefix:Person;\n'
        + ' ];\n'
        + '\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:name;\n'
        + '    rr:objectMap [ rml:reference "name" ];\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:age;\n'
        + '    rr:objectMap [ rml:reference "age" ];\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:likesSports;\n'
        + '    rr:objectMap  [\n'
        + '           rr:parentTriplesMap <#SPORTSmapping>;\n'
                      + 'rr:joinCondition [\n'
                      + 'rr:child "name" ;\n'
                      + 'rr:parent "../../../name";\n'
                      + ']\n'
        + '        ];\n'
        + '].\n'
        + '\n'
        + '<#SPORTSmapping>\n'
        + 'rml:logicalSource <#SPORTSSOURCE>;\n'
        + '\n'
        + ' rr:subjectMap [\n'
        + '    rr:termType rr:BlankNode;\n'
        + '    rr:class prefix:Sport;\n'
        + ' ];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:name;\n'
        + '    rr:objectMap [ rml:reference "name" ];\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:requires;\n'
        + '    rr:objectMap  [\n'
        + '           rr:parentTriplesMap <#REQmapping>;\n'
                      + 'rr:joinCondition [\n'
                      + 'rr:child "name" ;\n'
                      + 'rr:parent "../../name";\n'
      + ']\n'
        + '        ];\n'
        + '].\n'
        + '\n'
        + '<#REQmapping>\n'
        + 'rml:logicalSource <#REQUIRESSOURCE>;\n'
        + 'rr:subjectMap [\n'
        + '    rr:termType rr:BlankNode;\n'
        + '    rr:class prefix:Requirement;\n'
        + '];\n'
        + '\n'
        + 'rr:predicateObjectMap [\n'
        + '    rr:predicate prefix:thing;\n'
        + '    rr:objectMap [ rml:reference "thing" ];\n'
        + '].\n'
        + '\n'
        + '\n'
        + '\n'
        + '\n'
        + '\n'
        + '\n';
  const inputFiles = {
    './input.xml': '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<root>\n'
            + '    <element>\n'
            + '        <age>15</age>\n'
            + '        <name>Tom A.</name>\n'
            + '        <sports>\n'
            + '            <School>\n'
            + '                <element>\n'
            + '                    <name>Basketball</name>\n'
            + '                    <requires>\n'
            + '                        <element>\n'
            + '                            <thing>ball</thing>\n'
            + '                        </element>\n'
            + '                        <element>\n'
            + '                            <thing>basket</thing>\n'
            + '                        </element>\n'
            + '                    </requires>\n'
            + '                </element>\n'
            + '            </School>\n'
            + '        </sports>\n'
            + '    </element>\n'
            + '    <element>\n'
            + '        <age>16</age>\n'
            + '        <name>Tom B.</name>\n'
            + '        <sports>\n'
            + '            <School>\n'
            + '                <element>\n'
            + '                    <name>Football</name>\n'
            + '                    <requires>\n'
            + '                        <element>\n'
            + '                            <thing>ball</thing>\n'
            + '                        </element>\n'
            + '                    </requires>\n'
            + '                </element>\n'
            + '            </School>\n'
            + '        </sports>\n'
            + '    </element>\n'
            + '</root>',
  };


  let result = await parser.parseFileLive(mapFile, inputFiles, options).catch((err) => { console.log(err); });

  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);
  assert.equal(result[0].name, 'Tom A.');
  assert.equal(result[1].name, 'Tom B.');

  assert.equal(result[0].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_1');
  assert.equal(result[1].likesSports['@id'], '_:http%3A%2F%2Fsti2.at%2F%23SPORTSmapping_2');

  assert.equal(result[5].requires.length, 2);
});


//* ******************CSV Tests


it('CSV test', async () => {
  const options = {
    toRDF: true,
  };
  let result = await parser.parseFile('./tests/csvMappingTest/mapping.ttl', './tests/csvMappingTest/out.nq', options).catch((err) => { console.log(err); });
  result = prefixhelper.deleteAllPrefixesFromObject(result, prefixes);
  console.log(result);

  assert.equal(result, '<Student10> <http://xmlns.com/foaf/0.1/name> "Venus Williams" .\n<Student12> <http://xmlns.com/foaf/0.1/name> "Bernd Marc" .\n');
});
