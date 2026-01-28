import { useEffect,useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ACTIONS = [
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
]

const LogPage = ({ token, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);

  const defaultFilters = {
    action:"all",
    start:dayjs().startOf('day').toISOString(),
    end:dayjs().endOf('day').toISOString(),
    userId:"all",
    statusCode:"",
    labnumber:"",
    minTimeMs:0,
    maxTimeMs:999999,
    sortBy:"timestamp",
    sortDir:"desc",
    page:1,
    limit:50
  };

  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('logFilters');
    return saved ? JSON.parse(saved) : defaultFilters;
  });

  const fetchUsers = async () => {
    const res = await axios.get('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setUsers(res.data);
  };

    const fetchLogs = async () => {
    const res = await axios.get('/api/logs', {
        params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setLogs(res.data.data);
    setTotal(res.data.total);
  };

  const handleSearch = () => {
    fetchLogs();
  };

//download excel
  const handleExportExcel = async () => {
    const res = await axios.get('/api/logs/export/excel', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: "blob"
    });
    const blob = new Blob([res.data],{type:res.headers['content-type']});
    saveAs(blob, `logs.xlsx`);
  };

  //download pdf
 const handleExportPDF = () => {
  const doc = new jsPDF({ orientation: "landscape" });

  const rows = logs.map(l => ([
    l.userName || "",
    l.request?.endpoint || "",
    l.request?.method || "",
    dayjs(l.timestamp).format("DD/MM/YYYY HH:mm:ss"),
    (l.labnumber || []).join(", "),
    l.action,
    l.response?.statusCode,
    l.response?.message,
    l.response?.timeMs
  ]));

  doc.text("Logs Report", 14, 10);

  autoTable(doc, {
    head: [[
      "User","Endpoint","Method","Timestamp","Labnumber",
      "Action","Status","Message","TimeMs"
    ]],
    body: rows,
    startY: 16,
    styles: { fontSize: 7 }
  });

  doc.save("logs.pdf");
};


  useEffect(() => {
    if (!token) return;
    fetchUsers();
    fetchLogs();
            }, [token]);

   useEffect(() => {
    if (!token) return;
    fetchLogs();
  }, [filters.page, filters.limit]);

  useEffect(() => {
    localStorage.setItem('logFilters', JSON.stringify(filters));
  }, [filters]);


  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Log Viewer</h2>
          <div className="badge">Medical Audit Logs</div>
        </div>
        {/* Logout action */}
        <button className="btn btn-ghost" onClick={onLogout}>Logout</button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-grid">
          <div className="form-group">
            <label className="label">Action</label>
            <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
              <option value="all">แสดงทั้งหมด</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">User</label>
            <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}>
              <option value="all">แสดงทั้งหมด</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>
                  {u.prefix} {u.firstname} {u.lastname}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Status Code</label>
            <input
              type="number"
              value={filters.statusCode}
              onChange={(e) => setFilters({ ...filters, statusCode: e.target.value })}
              placeholder="e.g. 200"
            />
          </div>

          <div className="form-group">
            <label className="label">Labnumber</label>
            <input
              value={filters.labnumber}
              onChange={(e) => setFilters({ ...filters, labnumber: e.target.value })}
              placeholder="L1234567"
            />
          </div>

          <div className="form-group">
            <label className="label">Start</label>
            <input
              type="datetime-local"
              value={dayjs(filters.start).format('YYYY-MM-DDTHH:mm')}
              onChange={(e) => setFilters({ ...filters, start: new Date(e.target.value).toISOString() })}
            />
          </div>

          <div className="form-group">
            <label className="label">End</label>
            <input
              type="datetime-local"
              value={dayjs(filters.end).format('YYYY-MM-DDTHH:mm')}
              onChange={(e) => setFilters({ ...filters, end: new Date(e.target.value).toISOString() })}
            />
          </div>

          <div className="form-group">
            <label className="label">Min Time (ms)</label>
            <input
              type="number"
              value={filters.minTimeMs}
              onChange={(e) => setFilters({ ...filters, minTimeMs: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="label">Max Time (ms)</label>
            <input
              type="number"
              value={filters.maxTimeMs}
              onChange={(e) => setFilters({ ...filters, maxTimeMs: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="label">Sort by</label>
            <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
              <option value="timestamp">Timestamp</option>
              <option value="timeMs">Time (ms)</option>
              <option value="action">Action</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Sort direction</label>
            <select value={filters.sortDir} onChange={(e) => setFilters({ ...filters, sortDir: e.target.value })}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Search actions */}
        <div className="filter-actions">
          <button className="btn btn-primary" onClick={handleSearch}>Search</button>
          <button className="btn btn-ghost" onClick={() => setFilters(defaultFilters)}>Reset</button>
          <button className="btn btn-primary" onClick={handleExportExcel}>Export Excel</button>
          <button className="btn btn-primary" onClick={handleExportPDF}>Export PDF</button>

        </div>
      </div>

      {/* Summary and pagination */}
      <div className="summary">
        <span>Total: {total}</span>
        <span>Page {filters.page} / {Math.ceil(total / filters.limit) || 1}</span>
      </div>

      <div className="pagination">
        <button
          className="btn btn-ghost"
          onClick={() => setFilters({ ...filters, page: Math.max(filters.page - 1, 1) })}
          disabled={filters.page === 1}
        >
          Prev
        </button>

        <button
          className="btn btn-ghost"
          onClick={() =>
            setFilters({
              ...filters,
              page: Math.min(filters.page + 1, Math.ceil(total / filters.limit) || 1)
            })
          }
          disabled={filters.page >= Math.ceil(total / filters.limit)}
        >
          Next
        </button>

        <select
          value={filters.limit}
          onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Results table */}
      <div className="table-wrap">
        <table className="log-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Endpoint</th>
              <th>Method</th>
              <th>Timestamp</th>
              <th>Labnumber</th>
              <th>Action</th>
              <th>Status</th>
              <th>Message</th>
              <th>TimeMs</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td>{log.userName || ''}</td>
                <td className="cell-endpoint">{log.request?.endpoint}</td>
                <td>{log.request?.method}</td>
                <td>{dayjs(log.timestamp).format('DD/MM/YYYY HH:mm:ss')}</td>
                <td className="cell-labnumber">{(log.labnumber || []).join(', ')}</td>
                <td><span className="chip">{log.action}</span></td>
                <td>{log.response?.statusCode}</td>
                <td className="cell-message">{log.response?.message}</td>
                <td>{log.response?.timeMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

};

export default LogPage;
