const Counter = require('../models/Counter');

/**
 * Atomically increments a named counter and returns the next sequence number.
 * Used for receiptNo and studentId generation so concurrent requests never collide.
 */
async function nextSequence(name, session) {
  const options = { new: true, upsert: true };
  if (session) options.session = session;
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    options
  );
  return counter.seq;
}

async function generateReceiptNo({ prefix, startNumber, session }) {
  const seq = await nextSequence('receiptNo', session);
  const number = startNumber + seq - 1;
  return `${prefix}-${number}`;
}

async function generateStudentId(session) {
  const seq = await nextSequence('studentId', session);
  return `STU${String(seq).padStart(5, '0')}`;
}

// Separate counter/prefix from the seed data's manually-assigned "ADM1000".."ADM1019"
// range so auto-generated numbers can never collide with them.
async function generateAdmissionNo(session) {
  const seq = await nextSequence('admissionNo', session);
  return `ADM${2000 + seq}`;
}

module.exports = { nextSequence, generateReceiptNo, generateStudentId, generateAdmissionNo };
