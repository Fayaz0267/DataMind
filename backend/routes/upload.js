// routes/upload.js — tracks uploads in Firestore
const express = require('express');
const multer  = require('multer');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const { createSession } = require('../services/database');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'text/csv' ||
               file.mimetype === 'text/plain' ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               file.mimetype === 'application/vnd.ms-excel' ||
               file.originalname.endsWith('.csv') ||
               file.originalname.endsWith('.xlsx') ||
               file.originalname.endsWith('.xls');
    ok ? cb(null, true) : cb(new Error('Only CSV and Excel files are accepted.'));
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    let records;
    const isExcel = req.file.originalname.match(/\.xlsx?$/i);

    if (isExcel) {
      try {
        const XLSX = require('xlsx');
        const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        records    = XLSX.utils.sheet_to_json(ws, { defval: '' });
      } catch (e) {
        return res.status(400).json({ error: `Excel parse error: ${e.message}` });
      }
    } else {
      try {
        records = parse(req.file.buffer.toString('utf8'), {
          columns: true, skip_empty_lines: true, trim: true, cast: false,
        });
      } catch (e) {
        return res.status(400).json({ error: `CSV parse error: ${e.message}` });
      }
    }

    if (!records?.length) return res.status(400).json({ error: 'File is empty or has no data rows.' });

    const columns   = Object.keys(records[0]);
    const rawName   = req.file.originalname.replace(/\.(csv|xlsx?)$/i, '').replace(/[^a-zA-Z0-9]/g, '_');
    const tableName = rawName.slice(0, 40) || 'data';
    const sessionId = req.headers['x-session-id'] || uuidv4();
    const uid       = req.headers['x-user-uid'] || null;

    const schema = await createSession(sessionId, tableName, columns, records, req.file.originalname);

    // Track file upload in Firestore
    if (uid) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(uid).set({
          filesUploaded: admin.firestore.FieldValue.increment(1),
          lastActive:    admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore] Failed to track upload:', fsErr.message);
      }
    }

    const suggestions = generateSuggestions(schema);

    res.json({
      sessionId,
      filename:  req.file.originalname,
      fileType:  isExcel ? 'excel' : 'csv',
      tableName,
      schema,
      rowCount:  records.length,
      preview:   records.slice(0, 5),
      suggestions,
      message:   `✅ Loaded ${records.length.toLocaleString()} rows · ${columns.length} columns`,
    });
  } catch (err) {
    console.error('[UPLOAD]', err);
    res.status(500).json({ error: err.message });
  }
});

function generateSuggestions(schema) {
  const cols     = schema.columns;
  const numCols  = cols.filter(c => c.type === 'INTEGER' || c.type === 'REAL');
  const textCols = cols.filter(c => c.type === 'TEXT');
  const dateCol  = cols.find(c => /(date|month|year|time|period|week|day)/i.test(c.name));

  const metricPriority = ['revenue','sales','amount','price','total','profit','qty','units','count','value'];
  const metric = numCols.find(c => metricPriority.some(p => c.name.toLowerCase().includes(p))) || numCols[0];

  const catPriority = ['region','category','product','segment','type','name','department','status','city','country'];
  const cat = textCols.find(c => catPriority.some(p => c.name.toLowerCase().includes(p))) || textCols[0];

  const suggestions = [];
  if (dateCol && metric) suggestions.push(`Show ${metric.name} trend by ${dateCol.name}`);
  if (cat && metric)     suggestions.push(`Compare ${metric.name} by ${cat.name} as bar chart`);
  if (cat && metric)     suggestions.push(`Top 5 ${cat.name} by ${metric.name}`);
  if (cat && metric)     suggestions.push(`${metric.name} distribution by ${cat.name} as pie chart`);
  if (numCols.length>=2) suggestions.push(`Show correlation between ${numCols[0].name} and ${numCols[1]?.name}`);
  suggestions.push('Show all data as table');
  return suggestions.slice(0, 6);
}

module.exports = router;