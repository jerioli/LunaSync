import BulkImportModal from '@/components/bulk/BulkImportModal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowUpDown, ChevronDown, ChevronUp, FileText, Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

type SortField = 'name' | 'gender' | 'date_of_birth' | 'email' | 'phone' | 'marital_status';
type SortDirection = 'asc' | 'desc';

const PatientsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { patients, fetchPatients, currentUser } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Role-based access control - admin, receptionist, and doctor can use bulk import
  const canUseBulkImport = currentUser?.role === 'admin' || 
                          currentUser?.role === 'receptionist' || 
                          currentUser?.role === 'doctor';

  // Fetch patients when component mounts
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort patients
  const sortedPatients = [...patients].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle different data types
    if (sortField === 'date_of_birth') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
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

  // Filter patients based on search query
  const filteredPatients = sortedPatients.filter(patient => 
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery) ||
    (patient.marital_status || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="ml-2 h-4 w-4" /> : 
      <ChevronDown className="ml-2 h-4 w-4" />;
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        <div className="flex gap-2">
          {canUseBulkImport && (
            <BulkImportModal 
              type="patients" 
              onUploadComplete={() => {
                fetchPatients(); // Refresh the patient list after successful upload
              }}
            />
          )}
          <Button onClick={() => navigate('/patients/add')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Patient
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Records</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredPatients.length} of {patients.length} patients
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
                  placeholder="Search patients..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {(searchQuery || sortField !== 'name' || sortDirection !== 'asc') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSortField('name');
                    setSortDirection('asc');
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('name')}
                  >
                    Patient
                    {renderSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('gender')}
                  >
                    Gender
                    {renderSortIcon('gender')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('date_of_birth')}
                  >
                    Date of Birth
                    {renderSortIcon('date_of_birth')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('email')}
                  >
                    Contact
                    {renderSortIcon('email')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('marital_status')}
                  >
                    Civil Status
                    {renderSortIcon('marital_status')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {patient.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{patient.gender}</TableCell>
                    <TableCell>
                      {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>{patient.email}</div>
                      <div className="text-sm text-muted-foreground">{patient.phone}</div>
                    </TableCell>
                    <TableCell className="capitalize">{patient.marital_status || 'N/A'}</TableCell>
                    
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Record
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchQuery ? (
                        <>
                          <p className="text-lg font-medium">No patients found</p>
                          <p className="text-sm">Try adjusting your search term "{searchQuery}"</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-medium">No patients registered yet</p>
                          <p className="text-sm">Click "Add New Patient" to get started</p>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


    </div>
  );
};

export default PatientsList;