import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Eye, Pill, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useClinic } from '@/contexts/ClinicContext';
import axios from 'axios';

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
}

const PrescriptionManagement: React.FC = () => {
  const { currentUser } = useClinic();
  const [requests, setRequests] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PrescriptionRequest | null>(null);
  const [prescriptionContent, setPrescriptionContent] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const filteredRequests = requests.filter(request => 
    filterStatus === 'all' || request.status === filterStatus
  );

  const currentUserRole = currentUser?.role;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Prescription Management</h1>
          <p className="text-gray-600">Manage prescription requests from patients</p>
        </div>
        
        <div className="flex items-center space-x-4">
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
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
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Prescription Request Details</DialogTitle>
                            </DialogHeader>
                            {selectedRequest && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="font-semibold">Patient Name</Label>
                                    <p>{selectedRequest.patient_name}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Medication</Label>
                                    <p>{selectedRequest.medication_name}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Dosage</Label>
                                    <p>{selectedRequest.dosage}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Frequency</Label>
                                    <p>{selectedRequest.frequency}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Duration</Label>
                                    <p>{selectedRequest.duration}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Status</Label>
                                    <p>{getStatusBadge(selectedRequest.status)}</p>
                                  </div>
                                </div>
                                
                                {selectedRequest.additional_notes && (
                                  <div>
                                    <Label className="font-semibold">Additional Notes</Label>
                                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRequest.additional_notes}</p>
                                  </div>
                                )}

                                {/* Action buttons based on role and status */}
                                <div className="flex justify-end space-x-2 pt-4 border-t">
                                  {currentUserRole === 'receptionist' && selectedRequest.status === 'pending' && (
                                    <>
                                      <Button
                                        onClick={() => handleApprove(selectedRequest.id, 'receptionist_approve')}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve (Receptionist)
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
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </>
                                  )}

                                  {currentUserRole === 'doctor' && selectedRequest.status === 'receptionist_approved' && (
                                    <div className="space-y-4 w-full">
                                      <div>
                                        <Label htmlFor="prescription-content">Prescription Content</Label>
                                        <Textarea
                                          id="prescription-content"
                                          value={prescriptionContent}
                                          onChange={(e) => setPrescriptionContent(e.target.value)}
                                          placeholder="Enter the prescription details..."
                                          rows={6}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="doctor-notes">Doctor Notes (Optional)</Label>
                                        <Textarea
                                          id="doctor-notes"
                                          value={doctorNotes}
                                          onChange={(e) => setDoctorNotes(e.target.value)}
                                          placeholder="Enter any additional notes..."
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          onClick={() => handleApprove(selectedRequest.id, 'doctor_approve')}
                                          className="bg-green-600 hover:bg-green-700"
                                          disabled={!prescriptionContent.trim()}
                                        >
                                          <Mail className="h-4 w-4 mr-2" />
                                          Approve & Send Prescription
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
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {selectedRequest.status === 'rejected' && (
                                    <div className="w-full">
                                      <Label className="font-semibold text-red-600">Rejection Reason</Label>
                                      <p className="mt-1 p-2 bg-red-50 rounded text-red-800">
                                        {selectedRequest.rejection_reason}
                                      </p>
                                    </div>
                                  )}

                                  {selectedRequest.status === 'completed' && selectedRequest.prescription_content && (
                                    <div className="w-full">
                                      <Label className="font-semibold text-green-600">Prescription Content</Label>
                                      <p className="mt-1 p-2 bg-green-50 rounded text-green-800">
                                        {selectedRequest.prescription_content}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Rejection reason input */}
                                {(selectedRequest.status === 'pending' || selectedRequest.status === 'receptionist_approved') && (
                                  <div className="pt-4 border-t">
                                    <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
                                    <Textarea
                                      id="rejection-reason"
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Enter reason for rejection..."
                                      rows={3}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrescriptionManagement;
