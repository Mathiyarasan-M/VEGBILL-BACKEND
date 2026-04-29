const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/mathi/Documents/Veg-Commission-Backend /vendoranduser.xlsx');
const worksheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(worksheet);

const withPhone = data.filter(item => item.Contact_Phoneno && item.Contact_Phoneno !== 'NULL');
console.log('Total rows:', data.length);
console.log('Rows with phone:', withPhone.length);
if (withPhone.length > 0) {
    console.log('Sample phone:', withPhone[0].Contact_Phoneno);
}
