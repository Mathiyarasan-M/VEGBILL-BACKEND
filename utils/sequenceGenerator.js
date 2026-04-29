const Counter = require('../models/Counter.model');

const getNextSequence = async (id, model = null, filter = {}) => {
  // If a model is provided, check if the filtered collection is empty
  // If empty, reset the counter to 0 before incrementing
  if (model) {
    try {
      const count = await model.countDocuments(filter);
      if (count === 0) {
        await Counter.findOneAndUpdate(
          { id },
          { seq: 0 },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('Error checking collection count for reset:', err);
    }
  }

  const counter = await Counter.findOneAndUpdate(
    { id },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = { getNextSequence };
