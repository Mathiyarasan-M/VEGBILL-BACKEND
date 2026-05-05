const Sale = require('../models/Sale.model');
const Purchase = require('../models/Purchase.model');
const Payment = require('../models/Payment.model');
const Vendor = require('../models/Vendor.model');
const Farmer = require('../models/Farmer.model');
const Expense = require('../models/Expense.model');

// Helper to process daily transaction data
const processDailyData = async (date) => {
  const selectedDate = new Date(date);
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch Today's Data
  const [salesToday, purchasesToday, paymentsToday, expensesToday] = await Promise.all([
    Sale.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate('vendorId farmerId'),
    Purchase.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate('farmerId'),
    Payment.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate('partyId'),
    Expense.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate('category')
  ]);

  // Log for debugging
  console.log(`Report for ${date}: Sales: ${salesToday.length}, Purchases: ${purchasesToday.length}, Payments: ${paymentsToday.length}`);

  // 2. Identify all unique parties
  const partyIds = new Set();
  salesToday.forEach(s => { if (s.vendorId) partyIds.add(s.vendorId._id.toString()); });
  purchasesToday.forEach(p => { if (p.farmerId) partyIds.add(p.farmerId._id.toString()); });
  paymentsToday.forEach(p => { if (p.partyId) partyIds.add(p.partyId._id.toString()); });

  // 3. Fetch static data
  const [farmers, vendors] = await Promise.all([
    Farmer.find({ _id: { $in: Array.from(partyIds) } }).populate('address addressTamil'),
    Vendor.find({ _id: { $in: Array.from(partyIds) } }).populate('address addressTamil')
  ]);

  const partyMap = {};
  farmers.forEach(f => { partyMap[f._id.toString()] = { ...f._doc, type: 'Farmer' }; });
  vendors.forEach(v => { partyMap[v._id.toString()] = { ...v._doc, type: 'Vendor' }; });

  // 4. Opening Balances
  const [prevSales, prevPurchases, prevPayments] = await Promise.all([
    Sale.find({ date: { $lt: startOfDay }, vendorId: { $in: Array.from(partyIds) } }),
    Purchase.find({ date: { $lt: startOfDay }, farmerId: { $in: Array.from(partyIds) } }),
    Payment.find({ date: { $lt: startOfDay }, partyId: { $in: Array.from(partyIds) } })
  ]);

  const openingBalances = {};
  Array.from(partyIds).forEach(id => {
    const party = partyMap[id];
    if (!party) return;
    let bal = party.oldBalance || 0;
    prevSales.filter(s => s.vendorId?.toString() === id).forEach(s => bal += (s.totalAmount || 0));
    prevPurchases.filter(p => p.farmerId?.toString() === id).forEach(p => bal -= (p.totalAmount || 0));
    prevPayments.filter(p => p.partyId?.toString() === id).forEach(p => {
      if (p.type === 'OUT') bal += (p.amount || 0);
      else bal -= (p.amount || 0);
    });
    openingBalances[id] = bal;
  });

  // 5. Consolidate Activity
  const activity = {};
  Array.from(partyIds).forEach(id => {
    const party = partyMap[id];
    if (!party) return;

    const sales = salesToday.filter(s => s.vendorId?._id.toString() === id);
    const purchases = purchasesToday.filter(p => p.farmerId?._id.toString() === id);
    const payments = paymentsToday.filter(p => p.partyId?._id.toString() === id);

    const totalSalesValue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPurchaseValue = purchases.reduce((sum, p) => sum + ((p.items || []).reduce((s, i) => s + (i.actualAmount || i.totalAmount / 0.9 || 0), 0)), 0);
    const totalPayable = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalReceivable = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const debit = payments.filter(p => p.type === 'OUT').reduce((sum, p) => sum + (p.amount || 0), 0);
    const credit = payments.filter(p => p.type === 'IN').reduce((sum, p) => sum + (p.amount || 0), 0);

    activity[id] = {
      partyId: id,
      name: party.name,
      nameTamil: party.nameTamil,
      village: party.address?.nameEn || '',
      villageTamil: party.addressTamil?.nameTa || party.address?.nameTa || '',
      oldBalance: openingBalances[id] || 0,
      sales: party.type === 'Farmer' ? totalPurchaseValue : 0, 
      toGive: party.type === 'Farmer' ? totalPayable : 0,     
      purchase: party.type === 'Vendor' ? totalSalesValue : 0, 
      toGet: party.type === 'Vendor' ? totalReceivable : 0,    
      debit,
      credit,
      type: party.type
    };
  });

  // 6. Categorize
  const reportData = {
    advance: [], 
    f_cat2: [], f_cat3: [], f_cat4: [], f_cat5: [], f_cat6: [], f_cat7: [], f_cat8: [], f_cat9: [], f_cat10: [],
    v_cat11: [], v_cat12: [], v_cat13: [], v_cat14: [], v_cat15: [],
    returnCommission: [],
    expenses: []
  };

  paymentsToday.filter(p => p.entryType === 'Return Commission').forEach(p => {
    reportData.returnCommission.push({
      name: p.partyId?.name || p.note || 'Return Commission',
      nameTamil: p.partyId?.nameTamil || p.note || 'ரிட்டன் கமிஷன்',
      oldBalance: 0, sales: 0, toGive: 0, purchase: 0, toGet: 0,
      debit: p.type === 'OUT' ? p.amount : 0,
      credit: p.type === 'IN' ? p.amount : 0,
    });
  });

  expensesToday.forEach(exp => {
    reportData.expenses.push({
      name: exp.category?.name || 'Expense',
      nameTamil: exp.category?.name || 'செலவு',
      oldBalance: 0, sales: 0, toGive: 0, purchase: 0, toGet: 0,
      debit: exp.amount, credit: 0,
    });
  });

  Object.values(activity).forEach(act => {
    const { oldBalance, toGive, toGet, debit, credit, type } = act;
    if (type === 'Farmer') {
      const hasItems = toGive > 0;
      const tookMoney = debit > 0;
      const paidMoney = credit > 0;
      if (tookMoney && !hasItems && oldBalance === 0) reportData.advance.push(act);
      else if (tookMoney && !hasItems && oldBalance > 0) reportData.f_cat2.push(act);
      else if (hasItems && tookMoney && debit > toGive && oldBalance > 0) reportData.f_cat3.push(act);
      else if (hasItems && tookMoney && debit < toGive && oldBalance > 0) reportData.f_cat4.push(act);
      else if (hasItems && tookMoney && oldBalance > 0) reportData.f_cat5.push(act);
      else if (hasItems && tookMoney && oldBalance <= 0) reportData.f_cat6.push(act);
      else if (hasItems && !tookMoney && oldBalance <= 0) reportData.f_cat7.push(act);
      else if (hasItems && !tookMoney && oldBalance > 0) reportData.f_cat8.push(act);
      else if (!hasItems && paidMoney && credit <= oldBalance) reportData.f_cat9.push(act);
      else if (!hasItems && paidMoney && credit > oldBalance) reportData.f_cat10.push(act);
      else reportData.f_cat7.push(act);
    } else {
      const boughtToday = toGet > 0;
      const paidToday = credit > 0;
      if (boughtToday && paidToday && credit < toGet && oldBalance > 0) reportData.v_cat11.push(act);
      else if (boughtToday && !paidToday && oldBalance <= 0) reportData.v_cat12.push(act);
      else if (boughtToday && paidToday && oldBalance > 0) reportData.v_cat13.push(act);
      else if (boughtToday && !paidToday && oldBalance > 0) reportData.v_cat14.push(act);
      else if (!boughtToday && paidToday) reportData.v_cat15.push(act);
      else reportData.v_cat12.push(act);
    }
  });

  const summary = {
    oldBalance: Object.values(activity).reduce((s, a) => s + a.oldBalance, 0),
    sales: Object.values(activity).reduce((s, a) => s + a.sales, 0),
    toGive: Object.values(activity).reduce((s, a) => s + a.toGive, 0),
    purchase: Object.values(activity).reduce((s, a) => s + a.purchase, 0),
    toGet: Object.values(activity).reduce((s, a) => s + a.toGet, 0),
    debit: Object.values(activity).reduce((s, a) => s + a.debit, 0) + 
           reportData.expenses.reduce((s, e) => s + e.debit, 0) + 
           reportData.returnCommission.reduce((s, r) => s + r.debit, 0),
    credit: Object.values(activity).reduce((s, a) => s + a.credit, 0) + 
            reportData.returnCommission.reduce((s, r) => s + r.credit, 0),
  };

  return { reportData, summary };
};

exports.getDailyTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    const result = await processDailyData(date);
    res.json({ date, ...result });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDailyTransactionAbstract = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    
    const { reportData, summary } = await processDailyData(date);
    
    const getTotals = (data) => ({
      count: data.length,
      sales: data.reduce((s, a) => s + (a.sales || 0), 0),
      toGive: data.reduce((s, a) => s + (a.toGive || 0), 0),
      purchase: data.reduce((s, a) => s + (a.purchase || 0), 0),
      toGet: data.reduce((s, a) => s + (a.toGet || 0), 0),
      debit: data.reduce((s, a) => s + (a.debit || 0), 0),
      credit: data.reduce((s, a) => s + (a.credit || 0), 0),
    });

    const rows = [
      { sno: 1, label: 'முன் இருப்பு', labelEn: 'Old Balance', count: '-', sales: 0, toGive: 0, purchase: 0, toGet: 0, debit: 0, credit: summary.oldBalance, color: 'blue' },
      { sno: 2, label: 'முன்பணம்', labelEn: 'Advance', ...getTotals(reportData.advance), color: 'blue' },
      { sno: 3, label: 'விவசாயி - பழைய பற்று இருந்தும் பொருள் கொண்டு வராமல் மேலும் பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, No Items, Took Money', ...getTotals(reportData.f_cat2), color: 'red' },
      { sno: 4, label: 'விவசாயி - பழைய பற்று இருந்தும் இன்று கொண்டு வந்த பொருளை காட்டிலும் அதிகமாக பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, Items < Money Took', ...getTotals(reportData.f_cat3), color: 'red' },
      { sno: 5, label: 'விவசாயி - பழைய பற்று இருந்தும் இன்று கொண்டு வந்த பொருளை காட்டிலும் குறைவாக பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, Items > Money Took', ...getTotals(reportData.f_cat4), color: 'red' },
      { sno: 6, label: 'விவசாயி - பழைய பற்று இருந்தும் இன்று கொண்டு வந்த பொருளுக்கு பற்றை கழித்து பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, Deduction Payment', ...getTotals(reportData.f_cat5), color: 'blue' },
      { sno: 7, label: 'விவசாயி - பழைய பற்று இல்லாமல் கொண்டு வந்த பொருளுக்கு மட்டும் பணம் பெற்றவர்கள்.', labelEn: 'Farmers - No Old Debt, Items, Took Money', ...getTotals(reportData.f_cat6), color: 'blue' },
      { sno: 8, label: 'விவசாயி - பழைய பற்று இல்லாமல் கொண்டு வந்த பொருளுக்கு பணம் பெறாதவர்கள்.', labelEn: 'Farmers - No Old Debt, Items, No Money', ...getTotals(reportData.f_cat7), color: 'blue' },
      { sno: 9, label: 'விவசாயி - பொருள் கொண்டுவந்து பணம் பெறாமல் சென்றவர்கள்.', labelEn: 'Farmers - Items Brought, No Money', ...getTotals(reportData.f_cat8), color: 'blue' },
      { sno: 10, label: 'விவசாயி - பொருள் கொண்டுவராமல் பழைய வரவு மட்டும் பெற்றவர்கள்.', labelEn: 'Farmers - No Items, Old Credit Only', ...getTotals(reportData.f_cat9), color: 'blue' },
      { sno: 11, label: 'விவசாயி - பொருள் கொண்டுவராமல் பழைய வரவு அதிகமாக பெற்றவர்கள்.', labelEn: 'Farmers - No Items, Excess Credit', ...getTotals(reportData.f_cat10), color: 'blue' },
      { sno: 12, label: 'வியாபாரி - பழைய வரவு இருந்தும் கொள்முதல் தொகைக்கும் குறைவாக வாங்கியவர்கள்.', labelEn: 'Vendors - Old Credit, Bought < Credit', ...getTotals(reportData.v_cat11), color: 'blue' },
      { sno: 13, label: 'வியாபாரி - பழைய பாக்கி இல்லாமல் இன்று கொள்முதல் செய்தவர்கள் பணம் தராதவர்கள்.', labelEn: 'Vendors - No Debt, Bought, No Payment', ...getTotals(reportData.v_cat12), color: 'red' },
      { sno: 14, label: 'வியாபாரி - பழைய பாக்கி இருந்தும் இன்று கொள்முதல் செய்து பணம் கொடுத்தவர்கள்.', labelEn: 'Vendors - Old Debt, Bought, Paid', ...getTotals(reportData.v_cat13), color: 'red' },
      { sno: 15, label: 'வியாபாரி - பழைய பாக்கி இருந்தும் இன்று கொள்முதல் செய்து பணம் தராதவர்கள்.', labelEn: 'Vendors - Old Debt, Bought, No Payment', ...getTotals(reportData.v_cat14), color: 'red' },
      { sno: 16, label: 'வியாபாரி - பழைய பாக்கி மட்டும் வரவு.', labelEn: 'Vendors - Only Old Balance Credit', ...getTotals(reportData.v_cat15), color: 'blue' },
      { sno: 17, label: 'ரிட்டன் கமிஷன்', labelEn: 'Return Commission', ...getTotals(reportData.returnCommission), color: 'blue' },
      { sno: 18, label: 'இதர வரவு செலவு', labelEn: 'Expenses', ...getTotals(reportData.expenses), color: 'blue' },
    ];

    res.json({ date, rows, summary });
  } catch (error) {
    console.error('Abstract report error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDailyTransactionImportant = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    
    const { reportData, summary } = await processDailyData(date);
    
    // Select the critical categories for the Important Report
    const categories = [
      { id: 'advance', label: '1. முன்பணம்', labelEn: '1. Advance', data: reportData.advance || [] },
      { id: 'f_cat2', label: 'விவசாயி - பழைய பற்று இருந்தும் பொருள் கொண்டு வராமல் மேலும் பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, No Items, Took Money', data: reportData.f_cat2 || [] },
      { id: 'f_cat3', label: 'விவசாயி - பழைய பற்று இருந்தும் இன்று கொண்டு வந்த பொருளை காட்டிலும் அதிகமாக பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, Items < Money Took', data: reportData.f_cat3 || [] },
      { id: 'f_cat4', label: 'விவசாயி - பழைய பற்று இருந்தும் இன்று கொண்டு வந்த பொருளை காட்டிலும் குறைவாக பணம் பெற்றவர்கள்.', labelEn: 'Farmers - Old Debt, Items > Money Took', data: reportData.f_cat4 || [] },
      { id: 'f_cat10', label: 'விவசாயி - பொருள் கொண்டுவராமல் பழைய வரவு அதிகமாக பெற்றவர்கள்.', labelEn: 'Farmers - No Items, Excess Credit', data: reportData.f_cat10 || [] },
      { id: 'v_cat12', label: 'வியாபாரி - பழைய பாக்கி இல்லாமல் இன்று கொள்முதல் செய்தவர்கள் பணம் தராதவர்கள்.', labelEn: 'Vendors - No Debt, Bought, No Payment', data: reportData.v_cat12 || [] },
      { id: 'v_cat13', label: 'வியாபாரி - பழைய பாக்கி இருந்தும் இன்று கொள்முதல் செய்து பணம் கொடுத்தவர்கள்.', labelEn: 'Vendors - Old Debt, Bought, Paid', data: reportData.v_cat13 || [] },
      { id: 'v_cat14', label: 'வியாபாரி - பழைய பாக்கி இருந்தும் இன்று கொள்முதல் செய்து பணம் தராதவர்கள்.', labelEn: 'Vendors - Old Debt, Bought, No Payment', data: reportData.v_cat14 || [] },
      { id: 'return_commission', label: 'ரிட்டன் கமிஷன்', labelEn: 'Return Commission', data: reportData.returnCommission || [] },
    ];

    console.log(`Important Report Sent: ${categories.reduce((s, c) => s + c.data.length, 0)} items found across categories.`);

    res.json({ 
      date, 
      categories,
      summary
    });
  } catch (error) {
    console.error('Important report error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDailyPaymentLedger = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all payments and expenses for the day
    const [payments, expenses] = await Promise.all([
      Payment.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate('partyId'),
      Expense.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate('category')
    ]);

    // Format Cash In (Credits)
    const cashIn = payments.filter(p => p.type === 'IN').map(p => ({
      id: p._id,
      name: p.partyId?.name || p.note || 'Collection',
      nameTamil: p.partyId?.nameTamil || p.note || 'வரவு',
      amount: p.amount,
      note: p.note,
      partyType: p.partyId ? 'Party' : 'Other'
    }));

    // Format Cash Out (Debits)
    const cashOut = [
      ...payments.filter(p => p.type === 'OUT').map(p => ({
        id: p._id,
        name: p.partyId?.name || p.note || 'Payment',
        nameTamil: p.partyId?.nameTamil || p.note || 'பணம் கொடுத்தது',
        amount: p.amount,
        note: p.note,
        partyType: p.partyId ? 'Party' : 'Other'
      })),
      ...expenses.map(e => ({
        id: e._id,
        name: e.category?.name || 'Expense',
        nameTamil: e.category?.name || 'செலவு',
        amount: e.amount,
        note: e.note,
        partyType: 'Expense'
      }))
    ];

    // Get summary via processDailyData to keep consistency
    const { summary } = await processDailyData(date);

    res.json({
      date,
      cashIn,
      cashOut,
      summary: {
        openingBalance: summary.oldBalance,
        totalIn: cashIn.reduce((s, c) => s + c.amount, 0),
        totalOut: cashOut.reduce((s, c) => s + c.amount, 0),
        closingBalance: summary.oldBalance + summary.credit - summary.debit
      }
    });
  } catch (error) {
    console.error('Payment Ledger Error:', error);
    res.status(500).json({ message: error.message });
  }
};