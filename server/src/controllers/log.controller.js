const Log = require('../models/Log');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const ACTION_ORDER = [
  'labOrder',
  'labResult',
  'receive',
  'accept',
  'approve',
  'reapprove',
  'unapprove',
  'unreceive',
  'rerun',
  'save',
  'listTransactions',
  'getTransaction',
  'analyzerResult',
  'analyzerRequest'
];

const parseNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const buildFilters = (q, reqUser, activeUserIds = []) => {
  const filter = {};
  const {
    action,
    start,
    end,
    statusCode,
    labnumber,
    minTimeMs,
    maxTimeMs,
    userId
  } = q;

  if (reqUser?.level === 'user') {
    filter.userId = reqUser.userId;
  } else if (userId && userId !== 'all') {
    filter.userId = userId;
  } else if (activeUserIds.length) {
    filter.userId = { $in: activeUserIds };
  }

  if (action && action !== 'all') {
    const actions = action.split(',').map((a) => a.trim()).filter(Boolean);
    if (actions.length) filter.action = { $in: actions };
  }

  if (start || end) {
    filter.timestamp = {};
    if (start) filter.timestamp.$gte = new Date(start);
    if (end) filter.timestamp.$lte = new Date(end);
  }

  if (statusCode) filter['response.statusCode'] = statusCode;

  if (labnumber) {
    const labs = labnumber.split(',').map((l) => l.trim()).filter(Boolean);
    if (labs.length === 1) filter.labnumber = labs[0];
    if (labs.length > 1) filter.labnumber = { $in: labs };
  }

  if (minTimeMs !== undefined || maxTimeMs !== undefined) {
    filter['response.timeMs'] = {};
    if (minTimeMs !== undefined) filter['response.timeMs'].$gte = parseNumber(minTimeMs, 0);
    if (maxTimeMs !== undefined) filter['response.timeMs'].$lte = parseNumber(maxTimeMs, 999999);
  }

  return filter;
};

const buildSort = (q) => {
  const dir = q.sortDir === 'asc' ? 1 : -1;
  if (q.sortBy === 'timeMs') return { 'response.timeMs': dir };
  return { timestamp: dir };
};

const buildActionPipeline = (filter, direction, skip, limitNum, userCollection) => {
  const pipeline = [
    { $match: filter },
    { $addFields: { actionOrder: { $indexOfArray: [ACTION_ORDER, '$action'] } } },
    {
      $addFields: {
        actionOrder: {
          $cond: [{ $lt: ['$actionOrder', 0] }, ACTION_ORDER.length, '$actionOrder']
        }
      }
    },
    { $sort: { actionOrder: direction, timestamp: -1 } }
  ];

  if (Number.isFinite(skip) && skip > 0) {
    pipeline.push({ $skip: skip });
  }

  if (Number.isFinite(limitNum)) {
    pipeline.push({ $limit: limitNum });
  }

  pipeline.push(
    {
      $lookup: {
        from: userCollection,
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        userName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ['$user.prefix', ''] },
                { $ifNull: ['$user.firstname', ''] },
                ' ',
                { $ifNull: ['$user.lastname', ''] }
              ]
            }
          }
        }
      }
    },
    { $project: { user: 0, actionOrder: 0 } }
  );

  return pipeline;
};



// Export logs to Excel
const exportLogsExcel = async (req, res, next) => {
  try {
    const { userId, sortBy = 'timestamp', sortDir = 'desc' } = req.query;

    const activeUsers = await User.find({ isDel: false }).select('_id').lean();
    const activeUserIds = activeUsers.map((u) => u._id);
    const activeUserSet = new Set(activeUserIds.map((id) => id.toString()));

    if (req.user?.level !== 'user' && userId && userId !== 'all') {
      if (!activeUserSet.has(userId)) {
        return res.json({ total: 0, data: [] });
      }
    }

    const filter = buildFilters(req.query, req.user, activeUserIds);

    let logs = [];
    if (sortBy === 'action') {
      const direction = sortDir === 'asc' ? 1 : -1;
      const userCollection = User.collection.name;
      const pipeline = buildActionPipeline(filter, direction, null, null, userCollection);
      logs = await Log.aggregate(pipeline);
    } else {
      const sort = buildSort({ sortBy, sortDir });
      const rows = await Log.find(filter)
        .populate('userId', 'prefix firstname lastname username isDel')
        .sort(sort)
        .lean();

      logs = rows.map((row) => {
        const user = row.userId;
        const userName = user
          ? `${user.prefix || ''} ${user.firstname || ''} ${user.lastname || ''}`.trim()
          : '';
        return { ...row, userName };
      });
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Logs');
    ws.columns = [
      { header: 'User', key: 'user' },
      { header: 'Endpoint', key: 'endpoint' },
      { header: 'Method', key: 'method' },
      { header: 'Timestamp', key: 'timestamp' },
      { header: 'Labnumber', key: 'labnumber' },
      { header: 'Action', key: 'action' },
      { header: 'Status', key: 'status' },
      { header: 'Message', key: 'message' },
      { header: 'TimeMs', key: 'timeMs' }
    ];

    logs.forEach((l) => {
      ws.addRow({
        user: l.userName || '',
        endpoint: l.request?.endpoint || '',
        method: l.request?.method || '',
        timestamp: l.timestamp,
        labnumber: (l.labnumber || []).join(', '),
        action: l.action,
        status: l.response?.statusCode,
        message: l.response?.message,
        timeMs: l.response?.timeMs
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    return next(err);
  }
};

//export log to PDF
const exportLogsPDF = async (req, res, next) => {
  try{
    const{userId,sortBy = 'timestamp', sortDir = 'desc'}=req.query;

    const activeUsers = await User.find({isDel:false}).select('_id').lean();
    const activeUserIds = activeUsers.map((u) => u._id);
    const activeUserSet = new Set(activeUserIds.map((id) => id.toString()));

    if(req.user?.level !== 'user' && userId && userId !== 'all'){
      if(!activeUserSet.has(userId)){
        return res.json({total:0, data:[]});
      }
    }

    const filter = buildFilters(req.query, req.user, activeUserIds);

    let logs = [];
    if(sortBy === 'action'){
      const direction = sortDir === 'asc' ? 1 : -1;
      const userCollection = User.collection.name;
      const pipeline = buildActionPipeline(filter, direction, null, null, userCollection);
      logs = await Log.aggregate(pipeline);
    } else {
      const sort = buildSort({sortBy, sortDir});
      const rows = await Log.find(filter)
        .populate('userId', 'prefix firstname lastname username isDel')
        .sort(sort)
        .lean();

      logs = rows.map((row) => {
        const user = row.userId;
        const userName = user
          ? `${user.prefix || ''} ${user.firstname || ''} ${user.lastname || ''}`.trim()
          : '';
        return {...row, userName};
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.pdf');

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(14).text('Logs Report', {align: 'left'});
    doc.moveDown(1);

    const headers = ['User', 'Endpoint', 'Method', 'Timestamp', 'Labnumber', 'Action', 'Status', 'Message', 'TimeMs'];
    doc.fontSize(9).text(headers.join(' | '));
    doc.moveDown(0.5);

    logs.forEach((l) => {
      const row = [
        l.userName || '',
        l.request?.endpoint || '',
        l.request?.method || '',
        l.timestamp,
        (l.labnumber || []).join(', '),
        l.action,
        l.response?.statusCode,
        l.response?.message,
        l.response?.timeMs
      ];
      doc.text(row.join(' | '));
    });

    doc.end();
  }catch(err){
    return next(err);
  }
}


const listLogs = async (req, res, next) => {
  try {
    const {
      userId,
      page = '1',
      limit = '50',
      sortBy = 'timestamp',
      sortDir = 'desc'
    } = req.query;

    const pageNum = Math.max(parseNumber(page, 1), 1);
    const limitNum = Math.min(Math.max(parseNumber(limit, DEFAULT_LIMIT), 1), MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const activeUsers = await User.find({ isDel: false }).select('_id').lean();
    const activeUserIds = activeUsers.map((u) => u._id);
    const activeUserSet = new Set(activeUserIds.map((id) => id.toString()));

    if (req.user?.level !== 'user' && userId && userId !== 'all') {
      if (!activeUserSet.has(userId)) {
        return res.json({ total: 0, page: pageNum, limit: limitNum, data: [] });
      }
    }

    const filter = buildFilters(req.query, req.user, activeUserIds);

    if (sortBy === 'action') {
      const direction = sortDir === 'asc' ? 1 : -1;
      const userCollection = User.collection.name; // "users" ตามจริง
      const pipeline = buildActionPipeline(filter, direction, skip, limitNum, userCollection);

      const total = await Log.countDocuments(filter);
      const rows = await Log.aggregate(pipeline);
      return res.json({ total, page: pageNum, limit: limitNum, data: rows });
    }

    const sort = buildSort({ sortBy, sortDir });
    const total = await Log.countDocuments(filter);
    const rows = await Log.find(filter)
      .populate('userId', 'prefix firstname lastname username isDel')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const data = rows.map((row) => {
      const user = row.userId;
      const userName = user
        ? `${user.prefix || ''} ${user.firstname || ''} ${user.lastname || ''}`.trim()
        : '';
      return { ...row, userName };
    });

    return res.json({ total, page: pageNum, limit: limitNum, data });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listLogs,exportLogsExcel,exportLogsPDF };
// End of server/src/controllers/log.controller.js
