const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/mathi/Documents/Veg-Commission-Backend /vendoranduser.xlsx');
const worksheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(worksheet);

const categories = [...new Set(data.map(item => item.contact_category))];
console.log('Categories:', categories);

const samples = {};
categories.forEach(cat => {
    samples[cat] = data.find(item => item.contact_category === cat);
});
console.log('Samples:', JSON.stringify(samples, null, 2));
