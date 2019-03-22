const fs = require('fs');
const rmlmapperjs = require('../index.js');

const generateInputJSON = (number) => {
  const output = [];

  for (let i = 0; i < number; i++) {
    const item = {
      id: i,
      name: `name_${i}`,
      age: Math.random(),
      playsSport: {
        id: `sport${i}`,
        name: `Tennis_${i}`,
      },
    };
    output.push(item);
  }
  return output;
};

const countTimeForExecutionJSON = async (count, obj) => {
  const data = JSON.stringify(generateInputJSON(count));
  const options = { verbose: false };
  const mapfile = fs.readFileSync(`${__dirname}/mapfile.ttl`, 'utf-8');
  const files = { './input.json': data };
  const before = Date.now();
  const d = await rmlmapperjs.parseFileLive(mapfile, files, options);
  obj[count] = Date.now() - before;
  return d;
};


const generateInputXML = (number) => {
  let output = '';
  output += '<root>';
  for (let i = 0; i < number; i++) {
    const item = `<person><id>${i}</id><name>` + `name_${i}</name><age>${Math.random()}</age><playsSport><id>` + `sport${i}</id><name>` + `Tennis${i}</name></playsSport></person>`;
    output += item;
  }
  output += '</root>';
  return output;
};

const countTimeForExecutionXML = async (count, obj) => {
  const data = JSON.stringify(generateInputXML(count));
  const options = { verbose: false };
  const mapfile = fs.readFileSync(`${__dirname}/mapfilexml.ttl`, 'utf-8');
  const files = { './input.xml': data };
  const before = Date.now();
  const d = await rmlmapperjs.parseFileLive(mapfile, files, options);
  obj[count] = Date.now() - before;
  return d;
};

const checkPeformance = async (numbersToTest, averageOf) => {
  const objJSON = {};
  const objXML = {};


  console.log('*****JSON TESTS RUNNING*****');
  for (const num of numbersToTest) {
    let sum = 0;
    console.log(`doing ${num}`);
    for (let i = 0; i < averageOf; i++) {
      await countTimeForExecutionJSON(num, objJSON);
      sum += objJSON[num];
    }
    objJSON[num] = sum / averageOf;
  }

  console.log('*****DONE JSON TESTS*****');
  console.log('*****XML TESTS RUNNING*****');

  for (const num of numbersToTest) {
    let sum = 0;
    console.log(`doing ${num}`);
    for (let i = 0; i < averageOf; i++) {
      await countTimeForExecutionXML(num, objXML);
      sum += objXML[num];
    }
    objXML[num] = sum / averageOf;
  }
  console.log('*****DONE XML TESTS*****');
  console.log('*****RESULTS*****');

  console.log('JSON:');
  console.log(objJSON);

  console.log('XML:');
  console.log(objXML);
};

// please start the array from the high numbers to the low numbers
// averageOf defines how many times the execution is done per number and then the average is calculated
checkPeformance([50000, 10000, 5000, 3000, 1000, 500, 300, 100, 50, 10, 5, 1], 10);
