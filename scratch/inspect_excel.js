const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/mathi/Documents/Veg-Commission-Backend /vendoranduser.xlsx');
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\nSheet: ${sheetName}`);
    console.log('Headers:', data[0]);
    console.log('Row 1:', data[1]);
    console.log('Row 2:', data[2]);
});
