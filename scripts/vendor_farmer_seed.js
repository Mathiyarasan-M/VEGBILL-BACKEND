const mongoose = require('mongoose');
const XLSX = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');

// Models
const Farmer = require('../models/Farmer.model');
const Vendor = require('../models/Vendor.model');
const Village = require('../models/Village.model');
const Counter = require('../models/Counter.model');

dotenv.config();

// ==================== BAMINI TO UNICODE MAPPING ====================
const bamini_map = {
  "m": "அ", "M": "ஆ", ",": "இ", "<": "ஈ", "c": "உ", "C": "ஊ",
  "v": "எ", "V": "ஏ", "I": "ஐ", "x": "ஒ", "X": "ஓ", "xs": "ஔ", "H": "ஃ",
  "f": "க", "q": "ங", "r": "ச", "Q": "ஞ", "l": "ட", "z": "ண",
  "j": "த", "e": "ந", "g": "ப", "k": "ம", "a": "ய", "u": "ர",
  "v": "வ", "o": "ழ", "L": "ள", "w": "ற", "d": "ன",
  "S": "ஸ", "Z": "ஷ", "J": "ஜ", "W": "ஹ",
  "s": "ள", "y": "ல", "t": "வ", 
  "b": "டி", "h": "ா", "p": "ி", "P": "ீ", ";": "்", "i": "ை",
  "E": "ெ", "N": "ே", "R": "சு", "F": "கு", "G": "பு", "J": "து", "Y": "லு", "U": "ரு", "D": "நு", "T": "வ",
  "+": "ூ", "}": "ூ", "H": "ர்", "%": "உ", "&": "ஸ்ரீ",
};

const composite_replacements = [
  ["gl;b", "பட்டி"],
  ["l;b", "ட்டி"],
  ["kJiu", "மதுரை"],
  ["jp", "தி"],
  ["ng", "பெ"],
  ["Mz;", "ஆண்"],
  ["Guk;", "புரம்"],
  ["D}h;", "தூர்"],
  ["Y}h;", "யூர்"],
  ["hH", "ர்"],
  ["A+H", "யூர்"],
  ["+H", "ர்"],
  ["rp", "சி"],
  ["tp", "வி"],
  ["bp", "டி"],
];

function baminiToUnicode(text) {
  if (!text) return "";
  let res = text.trim();
  composite_replacements.forEach(([bamini, unicode]) => {
    const regex = new RegExp(bamini.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    res = res.replace(regex, unicode);
  });
  res = res.replace(/n([a-zA-Z])h/g, (match, char) => (bamini_map[char] || char) + "ொ");
  res = res.replace(/N([a-zA-Z])h/g, (match, char) => (bamini_map[char] || char) + "ோ");
  res = res.replace(/n([a-zA-Z])/g, (match, char) => (bamini_map[char] || char) + "ெ");
  res = res.replace(/E([a-zA-Z])/g, (match, char) => (bamini_map[char] || char) + "ெ");
  res = res.replace(/N([a-zA-Z])/g, (match, char) => (bamini_map[char] || char) + "ே");
  res = res.replace(/i([a-zA-Z])/g, (match, char) => (bamini_map[char] || char) + "ை");
  let final = "";
  for (let i = 0; i < res.length; i++) {
    const char = res[i];
    if (char.charCodeAt(0) > 128) final += char;
    else final += bamini_map[char] || char;
  }
  return final.replace(/்்/g, '்').replace(/்ா/g, 'ா').replace(/்ி/g, 'ி').replace(/்ீ/g, 'ீ').replace(/\s+/g, ' ').trim();
}

// ==================== UNICODE TAMIL TO ENGLISH ====================
function tamilToEnglish(text) {
  if (!text) return "";
  
  // Special handling for initials (e.g., "வி." -> "V.")
  const initialsMap = {
    "அ.": "A.", "ஆ.": "A.", "இ.": "I.", "ஈ.": "I.", "உ.": "U.", "ஊ.": "U.",
    "எ.": "E.", "ஏ.": "E.", "ஐ.": "Ai.", "ஒ.": "O.", "ஓ.": "O.", "ஔ.": "Au.",
    "க.": "K.", "ங.": "Ng.", "ச.": "S.", "ஞ.": "Ny.", "ட.": "T.", "ண.": "N.",
    "த.": "T.", "ந.": "N.", "ப.": "P.", "ம.": "M.", "ய.": "Y.", "ர.": "R.",
    "ல.": "L.", "வ.": "V.", "ழ.": "Zh.", "ள.": "L.", "ற.": "R.", "ன.": "N.",
    "வி.": "V.", "தி.": "T.", "மு.": "M.", "செ.": "S.", "பெ.": "P.", "ராம.": "Rama.",
    "கி.": "K.", "பி.": "P.", "சி.": "S.", "து.": "T.", "கு.": "K.", "பு.": "P."
  };

  let processedText = text;
  for (const [ta, en] of Object.entries(initialsMap)) {
    if (processedText.startsWith(ta)) {
      processedText = en + processedText.slice(ta.length);
      break;
    }
  }

  const vowels = {"ா":"a","ி":"i","ீ":"ee","ு":"u","ூ":"oo","ெ":"e","ே":"e","ை":"ai","ொ":"o","ோ":"o","ௌ":"au","்":""};
  const consonants = {"க":"k","ங":"ng","ச":"s","ஞ":"ny","ட":"t","ண":"n","த":"th","ந":"n","ப":"p","ம":"m","ய":"y","ர":"r","ல":"l","வ":"v","ழ":"zh","ள":"l","ற":"r","ன":"n","ஸ":"s","ஷ":"sh","ஜ":"j","ஹ":"h"};
  const independentVowels = {"அ":"A","ஆ":"Aa","இ":"I","ஈ":"Ee","உ":"U","ஊ":"Oo","எ":"E","ஏ":"Ae","ஐ":"Ai","ஒ":"O","ஓ":"Oe","ஔ":"Au"};

  let res = "";
  for (let i = 0; i < processedText.length; i++) {
    let char = processedText[i];
    let next = processedText[i+1];
    
    if (char === "." || char === " ") { res += char; continue; }
    if (char.charCodeAt(0) < 128) { res += char; continue; } // Already English/Special

    if (independentVowels[char]) { res += independentVowels[char]; }
    else if (consonants[char]) {
      let base = consonants[char];
      if (next && vowels[next] !== undefined) {
        res += base + vowels[next];
        i++;
      } else {
        res += base + "a";
      }
    }
  }
  return res.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/commission-ledger';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Farmer.deleteMany({});
    await Vendor.deleteMany({});
    await Counter.deleteMany({ id: { $in: ['farmerCode', 'vendorCode'] } });
    console.log('🗑️ Old Farmer and Vendor data cleared');

    // Fetch all villages for mapping
    const villages = await Village.find({});
    const villageMap = {};
    villages.forEach(v => {
      villageMap[v.villageId] = v;
    });
    console.log(`📍 Loaded ${villages.length} villages for mapping`);

    // Load Excel data
    const excelPath = path.join(__dirname, '..', 'vendoranduser.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`📊 Loaded ${data.length} records from Excel`);

    const farmersToInsert = [];
    const vendorsToInsert = [];

    let farmerCount = 0;
    let vendorCount = 0;

    for (const item of data) {
      const nameTamil = baminiToUnicode(item.contact_name || '');
      const nameEnglish = tamilToEnglish(nameTamil);
      const village = villageMap[item.contact_village];
      
      const commonData = {
        name: nameEnglish || 'Unknown',
        nameTamil: nameTamil,
        mobile: (item.Contact_Phoneno && item.Contact_Phoneno !== 'NULL') ? item.Contact_Phoneno : '0000000000',
        credit: item.contact_Cr || 0,
        debit: item.contact_Dr || 0,
      };

      if (item.contact_category === 'Seller') {
        farmerCount++;
        // Farmer model NOW requires ObjectId for address and addressTamil
        if (village) {
            farmersToInsert.push({
              ...commonData,
              farmerCode: `F${farmerCount.toString().padStart(4, '0')}`,
              address: village._id,
              addressTamil: village._id,
            });
        } else {
            const defaultVillage = villageMap[1];
            if (defaultVillage) {
                farmersToInsert.push({
                  ...commonData,
                  farmerCode: `F${farmerCount.toString().padStart(4, '0')}`,
                  address: defaultVillage._id,
                  addressTamil: defaultVillage._id,
                });
            }
        }
      } else if (item.contact_category === 'Buyer') {
        vendorCount++;
        // Vendor model requires ObjectId for address and addressTamil
        if (village) {
            vendorsToInsert.push({
              ...commonData,
              vendorCode: `V${vendorCount.toString().padStart(4, '0')}`,
              shopName: nameEnglish, // Using name as shop name for now
              address: village._id,
              addressTamil: village._id,
            });
        } else {
            const defaultVillage = villageMap[1];
            if (defaultVillage) {
                vendorsToInsert.push({
                  ...commonData,
                  vendorCode: `V${vendorCount.toString().padStart(4, '0')}`,
                  shopName: nameEnglish,
                  address: defaultVillage._id,
                  addressTamil: defaultVillage._id,
                });
            }
        }
      }
    }

    if (farmersToInsert.length > 0) {
      await Farmer.insertMany(farmersToInsert);
      await Counter.findOneAndUpdate({ id: 'farmerCode' }, { seq: farmerCount }, { upsert: true });
    }

    if (vendorsToInsert.length > 0) {
      await Vendor.insertMany(vendorsToInsert);
      await Counter.findOneAndUpdate({ id: 'vendorCode' }, { seq: vendorCount }, { upsert: true });
    }

    console.log(`🎉 Successfully seeded ${farmersToInsert.length} Farmers!`);
    console.log(`🎉 Successfully seeded ${vendorsToInsert.length} Vendors!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
