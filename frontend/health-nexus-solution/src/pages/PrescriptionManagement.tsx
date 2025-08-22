import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import axios from 'axios';
import { ArrowUpDown, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, Mail, Search, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Configure axios
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

interface PrescriptionRequest {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  patient_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  additional_notes: string;
  status: 'pending' | 'receptionist_approved' | 'doctor_approved' | 'completed' | 'rejected';
  requested_at: string;
  receptionist_approved_at?: string;
  doctor_approved_at?: string;
  prescription_content?: string;
  doctor_notes?: string;
  rejection_reason?: string;
  id_verification_front?: string;
  id_verification_back?: string;
  prescription_image?: string;
}

type SortField = 'patient_name' | 'medication_name' | 'status' | 'requested_at' | 'email';
type SortDirection = 'asc' | 'desc';

const PrescriptionManagement: React.FC = () => {
  const { currentUser } = useClinic();
  const [requests, setRequests] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PrescriptionRequest | null>(null);
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Search and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('requested_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/prescription-requests/');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching prescription requests:', error);
      toast.error('Failed to load prescription requests');
    } finally {
      setLoading(false);
    }
  };

  // Sorting helper functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortData = (data: PrescriptionRequest[]): PrescriptionRequest[] => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'requested_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue ? bValue.toLowerCase() : '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="ml-2 h-4 w-4" /> : 
      <ChevronDown className="ml-2 h-4 w-4" />;
  };

  // Filter and sort requests
  const filteredAndSortedRequests = sortData(
    requests.filter(request => {
      const matchesSearch = 
        request.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.medication_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
  );

  // Pagination logic
  const totalItems = filteredAndSortedRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredAndSortedRequests.slice(startIndex, endIndex);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortField, sortDirection]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleApprove = async (requestId: number, action: string) => {
    try {
      let payload: any = { action };
      
      if (action === 'doctor_approve') {
        payload.prescription_content = prescriptionContent;
        payload.doctor_notes = doctorNotes;
      } else if (action === 'reject') {
        payload.rejection_reason = rejectionReason;
      }

      const response = await axios.post(`/prescription-requests/${requestId}/approve/`, payload);
      
      toast.success(response.data.message);
      fetchRequests();
      setSelectedRequest(null);
      setPrescriptionContent('');
      setDoctorNotes('');
      setRejectionReason('');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      receptionist_approved: { color: 'bg-blue-100 text-blue-800', label: 'Receptionist Approved' },
      doctor_approved: { color: 'bg-green-100 text-green-800', label: 'Doctor Approved' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Use the paginated requests for display
  const filteredRequests = paginatedRequests;

  const currentUserRole = currentUser?.role;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescription Management</h1>
          <p className="text-muted-foreground">
            Manage prescription requests from patients
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prescription Requests</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} prescription requests
                {sortField && (
                  <span className="ml-2">
                    • Sorted by {sortField.replace('_', ' ')} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients, medications..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="receptionist_approved">Receptionist Approved</SelectItem>
                  <SelectItem value="doctor_approved">Doctor Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              {(searchQuery || filterStatus !== 'all' || sortField !== 'requested_at' || sortDirection !== 'desc') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setSortField('requested_at');
                    setSortDirection('desc');
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading prescription requests...
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchQuery || filterStatus !== 'all' ? (
                  <>
                    <p className="text-lg font-medium">No prescription requests found</p>
                    <p className="text-sm">Try adjusting your search term or filters</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">No prescription requests yet</p>
                    <p className="text-sm">Prescription requests from patients will appear here</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('patient_name')}
                    >
                      Patient Name
                      {renderSortIcon('patient_name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('medication_name')}
                    >
                      Medication
                      {renderSortIcon('medication_name')}
                    </Button>
                  </TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {renderSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort('requested_at')}
                    >
                      Requested At
                      {renderSortIcon('requested_at')}
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.patient_name}</TableCell>
                    <TableCell>{request.medication_name}</TableCell>
                    <TableCell>{request.dosage}</TableCell>
                    <TableCell>{request.frequency}</TableCell>
                    <TableCell>{request.duration}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Prescription Details</DialogTitle>
                            </DialogHeader>
                            {selectedRequest && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Patient</Label>
                                    <p className="font-medium">{selectedRequest.patient_name}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Medication</Label>
                                    <p className="font-medium">{selectedRequest.medication_name}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">DOB</Label>
                                    <p className="text-sm">{selectedRequest.date_of_birth}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Email</Label>
                                    <p className="text-sm">{selectedRequest.email}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Phone</Label>
                                    <p className="text-sm">{selectedRequest.phone}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Dosage</Label>
                                    <p className="text-sm">{selectedRequest.dosage}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Frequency</Label>
                                    <p className="text-sm">{selectedRequest.frequency}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Duration</Label>
                                    <p className="text-sm">{selectedRequest.duration}</p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Status</Label>
                                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                                  </div>
                                </div>
                                
                                {selectedRequest.additional_notes && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Additional Notes</Label>
                                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded text-muted-foreground">{selectedRequest.additional_notes}</p>
                                  </div>
                                )}

                                {/* ID Verification Images - Compact */}
                                {(selectedRequest.id_verification_front || selectedRequest.id_verification_back) && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">ID Verification</Label>
                                    <div className="mt-2 flex gap-2">
                                      {selectedRequest.id_verification_front && (
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-1">Front</p>
                                          <img
                                            src={selectedRequest.id_verification_front}
                                            alt="ID Front"
                                            className="w-full h-20 object-contain rounded border cursor-pointer hover:opacity-80"
                                            onClick={() => window.open(selectedRequest.id_verification_front, '_blank')}
                                          />
                                        </div>
                                      )}
                                      {selectedRequest.id_verification_back && (
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-1">Back</p>
                                          <img
                                            src={selectedRequest.id_verification_back}
                                            alt="ID Back"
                                            className="w-full h-20 object-contain rounded border cursor-pointer hover:opacity-80"
                                            onClick={() => window.open(selectedRequest.id_verification_back, '_blank')}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Prescription Image - Compact */}
                                {selectedRequest.prescription_image && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">Prescription Image</Label>
                                    <div className="mt-2">
                                      <img
                                        src={selectedRequest.prescription_image}
                                        alt="Prescription"
                                        className="w-full h-24 object-contain rounded border cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(selectedRequest.prescription_image, '_blank')}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Action buttons - simplified */}
                                {(selectedRequest.status === 'pending' || selectedRequest.status === 'receptionist_approved') && (
                                  <div className="flex flex-col gap-2 pt-3 border-t">
                                    <div className="flex gap-2">
                                      {currentUserRole === 'receptionist' && selectedRequest.status === 'pending' && (
                                        <>
                                          <Button
                                            onClick={() => handleApprove(selectedRequest.id, 'receptionist_approve')}
                                            className="bg-blue-600 hover:bg-blue-700 flex-1"
                                            size="sm"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Approve
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => {
                                              if (rejectionReason.trim()) {
                                                handleApprove(selectedRequest.id, 'reject');
                                              } else {
                                                toast.error('Please provide a rejection reason');
                                              }
                                            }}
                                            size="sm"
                                            className="flex-1"
                                          >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                          </Button>
                                        </>
                                      )}

                                      {currentUserRole === 'doctor' && selectedRequest.status === 'receptionist_approved' && (
                                        <>
                                          <Button
                                            onClick={() => handleApprove(selectedRequest.id, 'doctor_approve')}
                                            className="bg-green-600 hover:bg-green-700 flex-1"
                                            disabled={!prescriptionContent.trim()}
                                            size="sm"
                                          >
                                            <Mail className="h-4 w-4 mr-1" />
                                            Approve & Send
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => {
                                              if (rejectionReason.trim()) {
                                                handleApprove(selectedRequest.id, 'reject');
                                              } else {
                                                toast.error('Please provide a rejection reason');
                                              }
                                            }}
                                            size="sm"
                                            className="flex-1"
                                          >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                          </Button>
                                        </>
                                      )}
                                    </div>

                                    {/* Compact form inputs for doctor */}
                                    {currentUserRole === 'doctor' && selectedRequest.status === 'receptionist_approved' && (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={prescriptionContent}
                                          onChange={(e) => setPrescriptionContent(e.target.value)}
                                          placeholder="Prescription details..."
                                          rows={3}
                                          className="text-sm"
                                        />
                                        <Textarea
                                          value={doctorNotes}
                                          onChange={(e) => setDoctorNotes(e.target.value)}
                                          placeholder="Doctor notes (optional)..."
                                          rows={2}
                                          className="text-sm"
                                        />
                                      </div>
                                    )}

                                    {/* Compact rejection reason input */}
                                    <Textarea
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Rejection reason (if rejecting)..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            
            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Show
                  </p>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    entries
                  </p>
                </div>
                
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrescriptionManagement;
