const parser = require('rocketrml');

const doMapping = async () => {
  const options = {
    toRDF: true,
    verbose: true,
    xmlPerformanceMode: false,
    replace: false,
  };
  const result = await parser.parseFile('./mapping.ttl', './out.n3', options).catch((err) => { console.log(err); });
  console.log(result);
};

doMapping();
