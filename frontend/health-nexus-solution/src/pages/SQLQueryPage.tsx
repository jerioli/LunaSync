import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ENV } from "@/config/env";
import axios from "axios";
import { Database, Eye, EyeOff, History, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const API_BASE_URL = ENV.API_URL;

interface QueryLog {
  id: number;
  user: string;
  query: string;
  success: boolean;
  rows_affected: number;
  error: string | null;
  executed_at: string;
}

interface QueryResult {
  success: boolean;
  query_type: string;
  columns?: string[];
  results?: any[];
  rows_affected?: number;
  message?: string;
  executed_at: string;
  executed_by: string;
  error?: string;
}

export default function SQLQueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showPage, setShowPage] = useState(true);

  useEffect(() => {
    // Load visibility preference from localStorage
    const savedVisibility = localStorage.getItem("sqlQueryPageVisible");
    if (savedVisibility !== null) {
      setShowPage(savedVisibility === "true");
    }

    // Load query logs on mount
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/sql-query/logs/?limit=20`,
        {
          withCredentials: true,
        },
      );
      setLogs(response.data.logs);
    } catch (error: any) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/sql-query/execute/`,
        { query },
        { withCredentials: true },
      );
      console.log("Query Response:", response.data);
      setResult(response.data);

      if (response.data.success) {
        toast.success(
          response.data.query_type === "SELECT"
            ? `Query executed successfully! ${response.data.rows_affected} rows returned.`
            : `Query executed successfully! ${response.data.rows_affected} rows affected.`,
        );
      } else {
        toast.error("Query failed: " + response.data.error);
      }

      // Refresh logs after execution
      fetchLogs();
    } catch (error: any) {
      console.error("Query Error:", error);
      console.log("Error Response:", error.response?.data);
      toast.error(error.response?.data?.error || "Failed to execute query");
      setResult({
        success: false,
        query_type: "ERROR",
        error: error.response?.data?.error || "Failed to execute query",
        executed_at: new Date().toISOString(),
        executed_by: "Unknown",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePageVisibility = () => {
    const newVisibility = !showPage;
    setShowPage(newVisibility);
    localStorage.setItem("sqlQueryPageVisible", String(newVisibility));
    toast.info(
      newVisibility ? "SQL Query page visible" : "SQL Query page hidden",
    );
  };

  if (!showPage) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              SQL Query Page Hidden
            </CardTitle>
            <CardDescription>
              This page is currently hidden. Click below to show it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={togglePageVisibility} className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Show Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">SQL Query Tester</h1>
            <p className="text-muted-foreground">
              Execute raw SQL queries for testing purposes
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={togglePageVisibility}>
          <EyeOff className="h-4 w-4 mr-2" />
          Hide Page
        </Button>
      </div>

      {/* Quick Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Commands - Audit Logs</CardTitle>
          <CardDescription>
            Click to copy common audit log queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "SELECT * FROM public.audit_logs ORDER BY timestamp DESC LIMIT 20;",
              );
              toast.success("Query copied!");
            }}
          >
            View Recent Audit Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "SELECT id, timestamp, user_email, action, resource_type, description FROM public.audit_logs WHERE user_email = '' ORDER BY timestamp DESC LIMIT 20;",
              );
              toast.success("Query copied!");
            }}
          >
            View Logs with Empty Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "UPDATE public.audit_logs SET user_email = 'admin@example.com' WHERE id = 1;",
              );
              toast.success("Query copied!");
            }}
          >
            Update Email for Specific Log (Change id and email)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "UPDATE public.audit_logs SET timestamp = '2026-01-17 10:00:00+00:00' WHERE id = 1;",
              );
              toast.success("Query copied!");
            }}
          >
            Update Timestamp for Specific Log (Change id and timestamp)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "UPDATE public.audit_logs SET user_email = 'admin@lunasync.site', timestamp = NOW() WHERE action = 'LOGIN' AND user_email = '';",
              );
              toast.success("Query copied!");
            }}
          >
            Bulk Update: Set Email & Timestamp for Empty Login Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "SELECT DISTINCT action, COUNT(*) as count FROM public.audit_logs GROUP BY action ORDER BY count DESC;",
              );
              toast.success("Query copied!");
            }}
          >
            Count Logs by Action Type
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "SELECT * FROM public.audit_logs WHERE timestamp BETWEEN '2025-11-01' AND '2025-11-30' ORDER BY timestamp DESC;",
              );
              toast.success("Query copied!");
            }}
          >
            View Logs by Date Range (Modify dates)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`WITH RECURSIVE timestamp_gen AS (
  -- First record: random timestamp
  (SELECT 
    id,
    user_email,
    DATE '2025-11-01' + (random() * (DATE '2026-01-17' - DATE '2025-11-01'))::int 
    + TIME '09:00:00' 
    + (random() * (TIME '18:00:00' - TIME '09:00:00')) AS new_timestamp
  FROM public.audit_logs
  ORDER BY id
  LIMIT 1)
  
  UNION ALL
  
  -- Subsequent records
  SELECT 
    a.id,
    a.user_email,
    CASE 
      WHEN a.user_email = tg.user_email THEN
        tg.new_timestamp + INTERVAL '1 minute'
      ELSE
        DATE '2025-11-01' + (random() * (DATE '2026-01-17' - DATE '2025-11-01'))::int 
        + TIME '09:00:00' 
        + (random() * (TIME '18:00:00' - TIME '09:00:00'))
    END AS new_timestamp
  FROM public.audit_logs a
  JOIN timestamp_gen tg ON a.id = (
    SELECT id FROM public.audit_logs WHERE id > tg.id ORDER BY id LIMIT 1
  )
)
UPDATE public.audit_logs a
SET timestamp = tg.new_timestamp
FROM timestamp_gen tg
WHERE a.id = tg.id;`);
              toast.success("Query copied!");
            }}
          >
            Smart Timestamps (Same email +1min, Different email random)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`WITH ordered_logs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM public.audit_logs
),
base_timestamp AS (
  SELECT 
    DATE '2025-11-01' + (random() * (DATE '2026-01-17' - DATE '2025-11-01'))::int 
    + TIME '09:00:00' 
    + (random() * (TIME '18:00:00' - TIME '09:00:00')) AS start_time
)
UPDATE public.audit_logs a
SET timestamp = (
  SELECT start_time + ((ol.rn - 1) * INTERVAL '1 minute')
  FROM ordered_logs ol, base_timestamp
  WHERE ol.id = a.id
);`);
              toast.success("Query copied!");
            }}
          >
            Consecutive +1min (Simpler, all logs sequential)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`UPDATE public.audit_logs 
SET timestamp = (
  DATE '2025-11-01' + (random() * (DATE '2026-01-17' - DATE '2025-11-01'))::int 
  + TIME '09:00:00' 
  + (random() * (TIME '18:00:00' - TIME '09:00:00'))
)
WHERE id > 0;`);
              toast.success("Query copied!");
            }}
          >
            Simple Randomize (9am-6pm only, no consecutive logic)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                "UPDATE public.audit_logs SET user_email = 'newemail@example.com' WHERE user_email = 'oldemail@example.com';",
              );
              toast.success("Query copied!");
            }}
          >
            Replace All Email Addresses (Change old and new email)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`UPDATE patients 
SET registration_date = DATE '2025-11-18' + (floor(random() * 54)::int)
WHERE registration_date NOT IN (
  '2025-12-24', '2025-12-25', '2025-12-26',  -- Christmas
  '2025-12-31', '2026-01-01',                -- New Year
  '2026-01-09'                                -- Araw ng Maynila (optional)
)
AND (DATE '2025-11-18' + (floor(random() * 54)::int)) NOT IN (
  '2025-12-24', '2025-12-25', '2025-12-26',
  '2025-12-31', '2026-01-01',
  '2026-01-09'
);`);
              toast.success(
                "Query copied! Updates registration dates Nov 18 - Jan 10, excluding holidays.",
              );
            }}
          >
            Update Patient Registration Dates (Nov 18 - Jan 10, No Holidays)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`SELECT id, patient_id, registration_date 
FROM patients 
WHERE registration_date BETWEEN '2025-11-18' AND '2026-01-10'
AND registration_date IN ('2025-12-24', '2025-12-25', '2025-12-26', '2025-12-31', '2026-01-01', '2026-01-09')
ORDER BY registration_date;`);
              toast.success(
                "Query copied! Check if any patients registered on holidays.",
              );
            }}
          >
            Check Patients Registered on Holidays
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                `DELETE FROM appointments WHERE status = 'completed' AND date IN (SELECT registration_date FROM patients);`,
              );
              toast.success(
                "Query copied! This will delete existing completed appointments from registration dates.",
              );
            }}
          >
            Clear Existing Completed Appointments (from Registration Dates)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`INSERT INTO appointments (patient_id, doctor_id, date, time, status, appointment_type, confirmation_method, created_at, updated_at)
SELECT 
  p.id,
  (SELECT id FROM Users WHERE role = 'doctor' LIMIT 1),
  p.registration_date,
  (TIME '09:00:00' + (random() * INTERVAL '9 hours'))::time,
  'completed',
  'Consultation',
  'email',
  (p.registration_date::timestamp + INTERVAL '9 hours' + (random() * INTERVAL '9 hours'))::timestamp,
  (p.registration_date::timestamp + INTERVAL '9 hours' + (random() * INTERVAL '9 hours'))::timestamp
FROM patients p
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a 
  WHERE a.patient_id = p.id
  AND a.date = p.registration_date
);`);
              toast.success(
                "Query copied! Execute this first, then run the audit log query.",
              );
            }}
          >
            Step 1: Create Completed Appointments (9am-6pm, Registration Date)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`INSERT INTO appointments (patient_id, doctor_id, date, time, status, appointment_type, confirmation_method, created_at, updated_at)
SELECT 
  p.id,
  (SELECT id FROM Users WHERE role = 'doctor' LIMIT 1),
  p.registration_date,
  CASE (floor(random() * 22)::int)
    WHEN 0 THEN '09:00:00'::time
    WHEN 1 THEN '09:20:00'::time
    WHEN 2 THEN '09:40:00'::time
    WHEN 3 THEN '10:00:00'::time
    WHEN 4 THEN '10:20:00'::time
    WHEN 5 THEN '10:40:00'::time
    WHEN 6 THEN '11:00:00'::time
    WHEN 7 THEN '11:20:00'::time
    WHEN 8 THEN '11:40:00'::time
    WHEN 9 THEN '13:00:00'::time
    WHEN 10 THEN '13:20:00'::time
    WHEN 11 THEN '13:40:00'::time
    WHEN 12 THEN '14:00:00'::time
    WHEN 13 THEN '14:20:00'::time
    WHEN 14 THEN '14:40:00'::time
    WHEN 15 THEN '15:00:00'::time
    WHEN 16 THEN '15:20:00'::time
    WHEN 17 THEN '15:40:00'::time
    WHEN 18 THEN '16:00:00'::time
    WHEN 19 THEN '16:20:00'::time
    WHEN 20 THEN '16:40:00'::time
    ELSE '17:00:00'::time
  END,
  'completed',
  'Consultation',
  'email',
  (p.registration_date::timestamp + INTERVAL '14 hours')::timestamp,
  (p.registration_date::timestamp + INTERVAL '14 hours')::timestamp
FROM patients p
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a 
  WHERE a.patient_id = p.id
  AND a.date = p.registration_date
);`);
              toast.success(
                "Query copied! Execute this first, then run the audit log query.",
              );
            }}
          >
            Step 1 (Alt): Create Appointments (20-min slots only)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(
                `DELETE FROM audit_logs WHERE resource_type = 'APPOINTMENT' AND action = 'CREATE' AND DATE(timestamp) IN (SELECT registration_date FROM patients);`,
              );
              toast.success(
                "Query copied! This will delete existing appointment creation audit logs.",
              );
            }}
          >
            Clear Existing Appointment Audit Logs (from Registration Dates)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`INSERT INTO audit_logs (timestamp, user_email, action, resource_type, resource_id, resource_name, description, details, old_values, new_values, ip_address, user_agent, session_key, user_id)
SELECT 
  (p.registration_date::timestamp + INTERVAL '14 hours')::timestamp,
  COALESCE(u.email, ''),
  'CREATE',
  'APPOINTMENT',
  CAST(p.id AS TEXT),
  'Patient ' || COALESCE(p.patient_id, CAST(p.id AS TEXT)),
  'Created appointment for patient ' || COALESCE(p.patient_id, CAST(p.id AS TEXT)),
  '{}',
  '{}',
  '{}',
  NULL,
  'Mozilla/5.0',
  '',
  u.id
FROM patients p
LEFT JOIN Users u ON u.email = p.email
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs a 
  WHERE a.resource_type = 'APPOINTMENT' 
  AND a.action = 'CREATE' 
  AND a.resource_id = CAST(p.id AS TEXT)
  AND DATE(a.timestamp) = p.registration_date
);`);
              toast.success("Query copied!");
            }}
          >
            Step 2: Create Appointment Audit Logs (Registration Date @ 2pm)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`INSERT INTO audit_logs (timestamp, user_email, action, resource_type, resource_id, resource_name, description, details, old_values, new_values, ip_address, user_agent, session_key, user_id)
SELECT 
  a.created_at,
  COALESCE(u.email, ''),
  'CREATE APPOINTMENT',
  'APPOINTMENT',
  CAST(a.id AS TEXT),
  'Patient ' || COALESCE(p.patient_id, CAST(p.id AS TEXT)),
  'Created appointment for ' || COALESCE(p.patient_id, CAST(p.id AS TEXT)) || ' on ' || a.date || ' at ' || a.time || ' (Status: ' || a.status || ')',
  '{}',
  '{}',
  '{}',
  '127.0.0.1',
  'Mozilla/5.0',
  '',
  u.id
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN Users u ON u.email = p.email
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs al 
  WHERE al.resource_type = 'APPOINTMENT' 
  AND al.action = 'CREATE APPOINTMENT' 
  AND al.resource_id = CAST(a.id AS TEXT)
);`);
              toast.success(
                "Query copied! Creates detailed appointment logs with date, time, and status.",
              );
            }}
          >
            Step 2 (Alt): Create Detailed Audit Logs (with date/time/status)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`INSERT INTO audit_logs (timestamp, user_email, action, resource_type, resource_id, resource_name, description, details, old_values, new_values, ip_address, user_agent, session_key, user_id)
SELECT 
  (p.registration_date::timestamp + INTERVAL '3 hours' + (random() * INTERVAL '5 hours'))::timestamp,
  COALESCE(u.email, ''),
  'UPDATE',
  'PATIENT',
  CAST(p.id AS TEXT),
  'Patient ' || COALESCE(p.patient_id, CAST(p.id AS TEXT)),
  'Updated patient record for ' || COALESCE(p.patient_id, CAST(p.id AS TEXT)),
  '{}',
  '{}',
  '{}',
  NULL,
  'Mozilla/5.0',
  '',
  u.id
FROM patients p
LEFT JOIN Users u ON u.email = p.email
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs a 
  WHERE a.resource_type = 'PATIENT' 
  AND a.action = 'UPDATE' 
  AND a.resource_id = CAST(p.id AS TEXT)
  AND DATE(a.timestamp) = p.registration_date
);`);
              toast.success(
                "Query copied! Creates UPDATE PATIENT logs based on registration date.",
              );
            }}
          >
            Create Patient Update Audit Logs (3-8 hours after registration)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`UPDATE audit_logs
SET description = 'Created appointment for patient ' || p.patient_id,
    resource_name = 'Patient ' || p.patient_id
FROM patients p
WHERE audit_logs.resource_type = 'APPOINTMENT'
  AND audit_logs.action = 'CREATE'
  AND audit_logs.resource_id = CAST(p.id AS TEXT)
  AND p.patient_id IS NOT NULL;`);
              toast.success("Query copied!");
            }}
          >
            Update Appointment Logs to Use Patient IDs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => {
              setQuery(`DELETE FROM audit_logs
WHERE resource_type = 'PATIENT' 
AND resource_id IN (
  SELECT CAST(id AS TEXT) 
  FROM patients 
  WHERE is_deleted = 1
);`);
              toast.success(
                "Query copied! Deletes audit logs for archived patients.",
              );
            }}
          >
            Delete Audit Logs for Archived Patients
          </Button>
        </CardContent>
      </Card>

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle>Execute Query</CardTitle>
          <CardDescription>
            Enter your SQL query below. Be careful - queries will affect the
            database!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM accounts_customuser LIMIT 10;"
            className="font-mono text-sm min-h-[200px]"
          />
          <div className="flex gap-2">
            <Button onClick={executeQuery} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? "Executing..." : "Execute Query"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setResult(null);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Query Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Query Logs
              </CardTitle>
              <CardDescription>Recent query executions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? "Hide" : "Show"} Logs
            </Button>
          </div>
        </CardHeader>
        {showLogs && (
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No query logs yet
              </p>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-4 ${
                      log.success
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.executed_at).toLocaleString()} by{" "}
                          {log.user}
                        </p>
                        <p
                          className={`text-sm font-semibold ${log.success ? "text-green-600" : "text-red-600"}`}
                        >
                          {log.success ? "✓ Success" : "✗ Failed"} -{" "}
                          {log.rows_affected} rows affected
                        </p>
                      </div>
                    </div>
                    <pre className="bg-white border rounded p-2 text-xs font-mono overflow-x-auto">
                      {log.query}
                    </pre>
                    {log.error && (
                      <p className="mt-2 text-sm text-red-600 font-mono">
                        {log.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle
              className={result.success ? "text-green-600" : "text-red-600"}
            >
              {result.success
                ? "✓ Query Executed Successfully"
                : "✗ Query Failed"}
            </CardTitle>
            <CardDescription>
              Executed at: {new Date(result.executed_at).toLocaleString()} by{" "}
              {result.executed_by}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <>
                {result.query_type === "SELECT" &&
                result.columns &&
                result.results ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr>
                            {result.columns.map((col, idx) => (
                              <th
                                key={idx}
                                className="border border-gray-300 px-4 py-2 text-left font-semibold text-sm"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.results.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-50">
                              {result.columns!.map((col, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="border border-gray-300 px-4 py-2 text-sm"
                                >
                                  {row[col] !== null &&
                                  row[col] !== undefined ? (
                                    String(row[col])
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      NULL
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {result.rows_affected} row(s) returned
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: {result.query_type}
                      </p>
                    </div>
                  </div>
                ) : result.query_type === "MODIFICATION" ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <p className="text-lg font-semibold text-green-700">
                        {result.message}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <p>
                        Rows affected:{" "}
                        <span className="font-semibold">
                          {result.rows_affected}
                        </span>
                      </p>
                      <p>Type: {result.query_type}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-green-600">
                      {result.message}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Rows affected: {result.rows_affected}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 font-mono text-sm">{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
