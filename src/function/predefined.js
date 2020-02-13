const utm = require('utm');
const h2p = require('html2plaintext');

const namespace = 'http://sti2.at#';

const toUpperCase = ([str]) => str.toString().toUpperCase();

const utmToLat = (data) => {
  const x = data[0];
  const y = data[1];
  const zoneNumber = data[2];
  const zoneLetter = data[3];
  return utm.toLatLon(x, y, zoneNumber, zoneLetter, undefined, false).latitude;
};

const utmToLon = (data) => {
  const x = data[0];
  const y = data[1];
  const zoneNumber = data[2];
  const zoneLetter = data[3];
  return utm.toLatLon(x, y, zoneNumber, zoneLetter, undefined, false).longitude;
};

const htmlToText = (data) => {
  if (!data || !data[0]) {
    return undefined;
  }
  return h2p(data[0].toString());
};

const functionToExport = [toUpperCase, utmToLat, utmToLon, htmlToText];

const exp = functionToExport.reduce((acc, cur) => {
  acc[namespace + cur.name] = cur;
  return acc;
}, {});

exports.predefinedFunctions = exp;
