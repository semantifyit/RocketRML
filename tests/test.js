let assert = require('assert');

const parser = require('../index.js');


//TESTS FOR JSON

it('Basic straight mapping', async function(){
    let result = await parser.start('./tests/straightMapping/mapping.ttl', './tests/straightMapping/out.json',false).catch((err) => { console.log(err); });
    assert.equal(result['http://schema.org/name'], "Tom A.");
    assert.equal(result['http://schema.org/age'], 15);
    assert.equal(result['@type'], 'http://schema.org/Person');
    assert.equal(Object.keys(result).length, 3);
});

it('Basic straight double mapping', async function(){
    let result = await parser.start('./tests/straightDoubleMapping/mapping.ttl', './tests/straightDoubleMapping/out.json',false).catch((err) => { console.log(err); });
    assert.equal(result.length,2);
});

it('Nested mapping', async function(){
    let result = await parser.start('./tests/nestedMapping/mapping.ttl', './tests/nestedMapping/out.json',false).catch((err) => { console.log(err); });
    assert.equal(result['http://mytestprefix.org/likesSports']['http://mytestprefix.org/name'][0], 'Tennis');
    assert.equal(result['http://mytestprefix.org/likesSports']['http://mytestprefix.org/name'][1], 'Football');
});


it('Test with deleting prefixes', async function(){
    let result = await parser.start('./tests/straightMapping/mapping.ttl', './tests/straightMapping/out.json', true).catch((err) => { console.log(err); });
    assert.equal(result['name'], "Tom A.");
    assert.equal(result['age'], 15);
    assert.equal(result['@type'], 'Person');
    assert.equal(Object.keys(result).length, 3);
});

