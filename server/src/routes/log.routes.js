const express = require('express');
const {authRequired} = require('../middleware/auth');
const { listLogs, exportLogsExcel, exportLogsPDF} = require('../controllers/log.controller');

const router = express.Router();

router.get('/', authRequired, listLogs);
router.get('/export/excel', authRequired, exportLogsExcel);
router.get('/export/pdf', authRequired, exportLogsPDF);
module.exports = router;
