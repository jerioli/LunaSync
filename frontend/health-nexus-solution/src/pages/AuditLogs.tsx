import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Calendar,
  Eye,
  FileText,
  MapPin,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  details: string | Record<string, any>;
  ip_address: string;
  session_id?: string;
  changes?: Record<string, { old: any; new: any }>;
}

interface AuditLogResponse {
  success: boolean;
  audit_logs: AuditLog[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

const AuditLogs = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_previous: false,
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, actionFilter, resourceFilter, debouncedSearchTerm]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      if (actionFilter) params.append("action", actionFilter);
      if (resourceFilter) params.append("resource_type", resourceFilter);
      if (debouncedSearchTerm) params.append("user", debouncedSearchTerm);

      console.log(
        "Fetching audit logs from:",
        `/api/audit-logs/?${params.toString()}`,
      );

      const response = await fetch(`/api/audit-logs/?${params.toString()}`, {
        headers: {
          "X-Session-ID": localStorage.getItem("sessionId") || "",
        },
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error response text:", errorText);
        throw new Error(
          `Failed to fetch audit logs: ${response.status} ${response.statusText}`,
        );
      }

      const responseText = await response.text();
      console.log("Response text:", responseText.substring(0, 200));

      try {
        const data: AuditLogResponse = JSON.parse(responseText);
        setLogs(data.audit_logs);
        setPagination(data.pagination);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.log("Full response:", responseText);
        throw new Error("Invalid JSON response from server");
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleActionFilter = (action: string) => {
    setActionFilter(action === "all" ? "" : action);
    setCurrentPage(1);
  };

  const handleResourceFilter = (resource: string) => {
    setResourceFilter(resource === "all" ? "" : resource);
    setCurrentPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    const dateStr = date.toLocaleDateString("en-US", options);
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date: dateStr, time: timeStr };
  };

  const formatChanges = (changes: Record<string, { old: any; new: any }>) => {
    if (!changes || Object.keys(changes).length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {Object.entries(changes).map(([field, change]) => (
          <div key={field} className="text-sm">
            <span className="font-medium">{field}:</span>
            <div className="ml-2">
              <span className="text-red-600">
                Old: {JSON.stringify(change.old)}
              </span>
              <br />
              <span className="text-green-600">
                New: {JSON.stringify(change.new)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleViewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  if (!currentUser?.can_view_audit_logs) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view audit logs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return "bg-green-50 text-green-700 border-green-200";
      case "logout":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "user created":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "permission modified":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "deleted":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading audit logs...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor system activities and user actions
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm z-10">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by user..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => handleActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white relative z-20"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="READ">Read</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>

        <select
          value={resourceFilter}
          onChange={(e) => handleResourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white relative z-20"
        >
          <option value="">All Resources</option>
          <option value="PATIENT">Patient</option>
          <option value="STAFF">Staff</option>
          <option value="APPOINTMENT">Appointment</option>
          <option value="MEDICAL_REQUEST">Medical Request</option>
          <option value="MEDICAL_DOCUMENT">Medical Document</option>
          <option value="AUTH">Authentication</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Activity
          </CardTitle>
          <CardDescription>
            Recent system activities and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="hidden md:table-cell">User</TableHead>
                  <TableHead className="hidden sm:table-cell">Action</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Details
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    IP Address
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => (
                    <React.Fragment key={log.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono text-sm">
                                {formatDateTime(log.timestamp).date}
                                <span className="text-green-500 ml-2">
                                  {formatDateTime(log.timestamp).time}
                                </span>
                              </div>
                              <div className="md:hidden mt-1">
                                <div className="font-medium text-sm">
                                  {log.user || "System"}
                                </div>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${getActionBadgeColor(log.action)}`}
                                >
                                  {log.action}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="md:hidden h-8 w-8 p-0"
                              onClick={() =>
                                setExpandedRow(
                                  expandedRow === index ? null : index,
                                )
                              }
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${expandedRow === index ? "rotate-180" : ""}`}
                              />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="font-medium">
                            {log.user || "System"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeColor(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs hidden lg:table-cell">
                          <div className="text-sm text-gray-900 truncate">
                            {typeof log.details === "string"
                              ? log.details
                              : JSON.stringify(log.details)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 hidden md:table-cell">
                          {log.ip_address || "N/A"}
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLogDetails(log);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRow === index && (
                        <TableRow className="md:hidden bg-muted/30">
                          <TableCell colSpan={6}>
                            <div className="space-y-2 py-2">
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Details:
                                </span>
                                <p className="text-sm mt-1">
                                  {typeof log.details === "string"
                                    ? log.details
                                    : JSON.stringify(log.details)}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  IP Address:
                                </span>
                                <p className="text-sm mt-1">
                                  {log.ip_address || "N/A"}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewLogDetails(log)}
                                className="w-full mt-2"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing {(pagination.current_page - 1) * 20 + 1} to{" "}
                {Math.min(pagination.current_page * 20, pagination.total_count)}{" "}
                of {pagination.total_count} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_previous}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Previous</span>
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  <span className="hidden sm:inline">Page </span>
                  {pagination.current_page}{" "}
                  <span className="hidden sm:inline">
                    of {pagination.total_pages}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                >
                  <span className="hidden sm:inline mr-2">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Timestamp
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-sm">
                        {formatDateTime(selectedLog.timestamp).date}
                        <span className="text-green-500 ml-2">
                          {formatDateTime(selectedLog.timestamp).time}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      User
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {selectedLog.user || "System"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      IP Address
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-mono">
                        {selectedLog.ip_address || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Action
                    </label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getActionBadgeColor(selectedLog.action)}`}
                      >
                        {selectedLog.action}
                      </span>
                    </div>
                  </div>

                  {selectedLog.resource_type && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Resource Type
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {selectedLog.resource_type}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedLog.resource_id && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Resource ID
                      </label>
                      <div className="mt-1">
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedLog.resource_id}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedLog.session_id && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">
                        Session ID
                      </label>
                      <div className="mt-1">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
                          {selectedLog.session_id}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div>
                <label className="text-sm font-semibold text-gray-600">
                  Details
                </label>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {typeof selectedLog.details === "string"
                      ? selectedLog.details
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Changes Section */}
              {selectedLog.changes &&
                Object.keys(selectedLog.changes).length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Changes Made
                    </label>
                    <div className="mt-2 space-y-3">
                      {Object.entries(selectedLog.changes).map(
                        ([field, change]) => (
                          <div
                            key={field}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="font-medium text-sm text-gray-700 mb-2">
                              {field}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs font-semibold text-red-600">
                                  BEFORE
                                </span>
                                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">
                                  <pre className="whitespace-pre-wrap text-red-800">
                                    {JSON.stringify(change.old, null, 2)}
                                  </pre>
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-green-600">
                                  AFTER
                                </span>
                                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                  <pre className="whitespace-pre-wrap text-green-800">
                                    {JSON.stringify(change.new, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
