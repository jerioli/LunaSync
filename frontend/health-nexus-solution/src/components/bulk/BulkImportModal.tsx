import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { FileText, Upload, UserPlus, Users } from 'lucide-react';
import React, { useState } from 'react';

// Configure axios base URL
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

interface BulkImportModalProps {
  type: 'patients' | 'staff';
}

export default function BulkImportModal({ type }: BulkImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Simple POST request without authentication
      const response = await axios.post(`bulk/${type}/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      const result = response.data;
      toast({
        title: "Upload Successful",
        description: `Successfully imported ${result.created_count} ${type}. ${result.errors?.length || 0} errors.`,
      });
      setIsOpen(false);
      setUploadFile(null);
    } catch (error: any) {
      console.error('Upload error:', error);
      console.log('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to upload file";
      toast({
        title: "Upload Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const downloadTemplate = () => {
    const headers = type === 'patients' 
      ? ['name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'marital_status']
      : ['first_name', 'last_name', 'email', 'phone', 'role', 'department', 'license_number'];
    
    const csvContent = headers.join(',') + '\n' + 
      (type === 'patients' 
        ? 'John Doe,john.doe@email.com,+1234567890,1990-01-01,male,"123 Main St",single'
        : 'Jane,Smith,jane.smith@hospital.com,+1234567890,doctor,cardiology,MD12345');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Bulk Add {type === 'patients' ? 'Patients' : 'Staff'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'patients' ? <Users className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            Bulk Import {type === 'patients' ? 'Patients' : 'Staff'}
          </DialogTitle>
        </DialogHeader>

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload">File Upload</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="template">Download Template</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload CSV/Excel File
                    </CardTitle>
                    <CardDescription>
                      Upload a CSV or Excel file containing {type} data. Make sure the file follows the required format.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Select File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                      />
                    </div>
                    
                    {uploadFile && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => uploadFile && handleFileUpload(uploadFile)}
                        disabled={!uploadFile || isUploading}
                        className="flex-1"
                      >
                        {isUploading ? 'Uploading...' : 'Upload & Import'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={downloadTemplate}
                      >
                        Download Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Manual Bulk Entry</CardTitle>
                    <CardDescription>
                      Enter multiple {type} records manually using a form interface.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ManualBulkEntry type={type} onComplete={() => setIsOpen(false)} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="template" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Template & Instructions
                    </CardTitle>
                    <CardDescription>
                      Download the template file and learn about the required format.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Required Fields:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {type === 'patients' ? (
                          <>
                            <div>• name (required)</div>
                            <div>• email (required, unique)</div>
                            <div>• phone (required)</div>
                            <div>• date_of_birth (YYYY-MM-DD)</div>
                            <div>• gender (male/female/other)</div>
                            <div>• address (optional)</div>
                            <div>• marital_status (optional)</div>
                          </>
                        ) : (
                          <>
                            <div>• first_name (required)</div>
                            <div>• last_name (required)</div>
                            <div>• email (required, unique)</div>
                            <div>• phone (required)</div>
                            <div>• role (doctor/receptionist/admin)</div>
                            <div>• department (optional)</div>
                            <div>• license_number (for doctors)</div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Button onClick={downloadTemplate} className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Download {type === 'patients' ? 'Patient' : 'Staff'} Template
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
  );
}

function ManualBulkEntry({ type, onComplete }: { type: 'patients' | 'staff'; onComplete: () => void }) {
  const [entries, setEntries] = useState([getEmptyEntry(type)]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  function getEmptyEntry(type: 'patients' | 'staff') {
    return type === 'patients' 
      ? { name: '', email: '', phone: '', date_of_birth: '', gender: 'other', address: '', marital_status: 'single' }
      : { first_name: '', last_name: '', email: '', phone: '', role: '', department: '', license_number: '' };
  }

  const addEntry = () => {
    setEntries([...entries, getEmptyEntry(type)]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: string, value: string) => {
    setEntries(entries.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Simple POST request without authentication
      const response = await axios.post(`bulk/${type}/upload/`, { data: entries });

      const result = response.data;
      toast({
        title: "Bulk Entry Successful",
        description: `Successfully created ${result.created_count} ${type}.`,
      });
      onComplete();
    } catch (error: any) {
      console.error('Submit error:', error);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to create entries";
      toast({
        title: "Bulk Entry Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Entry {index + 1}</h4>
            {entries.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEntry(index)}
              >
                Remove
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {type === 'patients' ? (
              <>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={entry.name}
                    onChange={(e) => updateEntry(index, 'name', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={entry.email}
                    onChange={(e) => updateEntry(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={entry.phone}
                    onChange={(e) => updateEntry(index, 'phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    value={entry.date_of_birth}
                    onChange={(e) => updateEntry(index, 'date_of_birth', e.target.value)}
                    type="date"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={entry.gender} onValueChange={(value) => updateEntry(index, 'gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marital Status</Label>
                  <Select value={entry.marital_status} onValueChange={(value) => updateEntry(index, 'marital_status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    value={entry.address}
                    onChange={(e) => updateEntry(index, 'address', e.target.value)}
                    placeholder="Full address"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={entry.first_name}
                    onChange={(e) => updateEntry(index, 'first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={entry.last_name}
                    onChange={(e) => updateEntry(index, 'last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={entry.email}
                    onChange={(e) => updateEntry(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={entry.phone}
                    onChange={(e) => updateEntry(index, 'phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={entry.role} onValueChange={(value) => updateEntry(index, 'role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Input
                    value={entry.department}
                    onChange={(e) => updateEntry(index, 'department', e.target.value)}
                    placeholder="Department"
                  />
                </div>
                <div className="col-span-2">
                  <Label>License Number (for doctors)</Label>
                  <Input
                    value={entry.license_number}
                    onChange={(e) => updateEntry(index, 'license_number', e.target.value)}
                    placeholder="License number"
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      ))}
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={addEntry}>
          Add Another Entry
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Creating...' : `Create ${entries.length} ${type}`}
        </Button>
      </div>
    </div>
  );
}
