const fs = require('fs');
const path = require('path');

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
  [";b", "ட்டி"],
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

// ==================== IMPROVED UNICODE TAMIL TO ENGLISH ====================
function tamilToEnglish(text) {
  if (!text) return "";
  const vowels = {"ா":"a","ி":"i","ீ":"i","ு":"u","ூ":"u","ெ":"e","ே":"e","ை":"ai","ொ":"o","ோ":"o","ௌ":"au","்":""};
  const consonants = {"க":"k","ங":"ng","ச":"s","ஞ":"ny","ட":"d","ண":"n","த":"th","ந":"n","ப":"p","ம":"m","ய":"y","ர":"r","ல":"l","வ":"v","ழ":"zh","ள":"l","ற":"r","ன":"n","ஸ":"s","ஷ":"sh","ஜ":"j","ஹ":"h"};
  const independentVowels = {"அ":"A","ஆ":"A","இ":"I","ஈ":"I","உ":"U","ஊ":"U","எ":"E","ஏ":"E","ஐ":"Ai","ஒ":"O","ஓ":"O","ஔ":"Au"};

  let res = "";
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    let next = text[i+1];
    if (independentVowels[char]) { res += independentVowels[char]; }
    else if (consonants[char]) {
      let base = consonants[char];
      if (next && vowels[next] !== undefined) {
        res += base + vowels[next];
        i++;
      } else {
        res += base + "a";
      }
    } else if (char === "." || char === " ") { res += char; }
  }
  return res.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function parseVillageFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const villages = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (line.includes('Village_Id') || line.includes('Village_Name') || line === 'active') { i++; continue; }
    let villageId, rawName, isActive = true;
    if (line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim());
      if (!isNaN(parseInt(parts[0]))) { villageId = parseInt(parts[0]); rawName = parts[1]; if (parts.length > 2) isActive = parts[parts.length - 1] === '1'; }
    } else if (!isNaN(parseInt(line))) {
      villageId = parseInt(line); i++;
      if (i < lines.length) { rawName = lines[i]; i++; if (i < lines.length && (lines[i] === '1' || lines[i] === '0')) isActive = lines[i] === '1'; else i--; }
    }
    if (villageId && rawName) {
      const nameTa = baminiToUnicode(rawName);
      villages.push({ villageId, nameTa, nameEn: tamilToEnglish(nameTa), isActive });
    }
    i++;
  }
  return villages;
}

const inputPath = path.join(__dirname, '..', 'village_raw.txt');
const outputPath = path.join(__dirname, '..', 'villages_converted.json');
const villages = parseVillageFile(inputPath);
fs.writeFileSync(outputPath, JSON.stringify(villages, null, 2), 'utf-8');
console.log(`✅ Conversion successful. Total: ${villages.length}`);
villages.slice(0, 10).forEach(v => console.log(`${v.villageId}: ${v.nameTa} | ${v.nameEn}`));
