import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image, Search, Upload, FileText, PlusCircle, ArrowLeft } from 'lucide-react';
import OcrScanner from '@/components/lab-results/OcrScanner';
import OcrResultDisplay from '@/components/lab-results/OcrResultDisplay';
import { toast } from 'sonner';

const LabResults = () => {
  const { patients, labResults, users, addLabResult } = useClinic();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get query parameters for patient context
  const patientId = searchParams.get('patientId');
  const patientName = searchParams.get('patientName');
  const returnTo = searchParams.get('returnTo');
  const showBackButton = returnTo === 'patient';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [ocrExtractedText, setOcrExtractedText] = useState<string | null>(null);
  const [matchedPatientId, setMatchedPatientId] = useState<string | undefined>(undefined);
  const [authorizedBy, setAuthorizedBy] = useState<string | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [resultType, setResultType] = useState('');  const [resultNotes, setResultNotes] = useState('');
  const [resultAuthorizedBy, setResultAuthorizedBy] = useState('');
  
  // Pre-select patient when coming from patient management
  useEffect(() => {
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patientId);
      }
    }
  }, [patientId, patients]);
  
  const handleOcrComplete = (text: string, patientId?: string, doctor?: string) => {
    setOcrExtractedText(text);
    setMatchedPatientId(patientId);
    setAuthorizedBy(doctor);
  };
  
  const handleEditAndAdd = () => {
    if (ocrExtractedText) {
      if (matchedPatientId) {
        setSelectedPatient(matchedPatientId);
      } else {
        const patientNameMatch = ocrExtractedText.match(/Patient Name: ([^\n]+)/);
        if (patientNameMatch && patientNameMatch[1]) {
          const patientName = patientNameMatch[1].trim();
          const matchedPatient = patients.find(p => 
            p.name.toLowerCase().includes(patientName.toLowerCase())
          );
          if (matchedPatient) {
            setSelectedPatient(matchedPatient.id);
          }
        }
      }
      
      const resultTypeMatch = ocrExtractedText.match(/(HEMATOLOGY|BIOCHEMISTRY|RADIOLOGY|MICROBIOLOGY)/i);
      if (resultTypeMatch && resultTypeMatch[0]) {
        setResultType(resultTypeMatch[0]);
      }
      
      setResultNotes(ocrExtractedText);
      
      if (authorizedBy) {
        setResultAuthorizedBy(authorizedBy);
      } else {
        const authorizedByMatch = ocrExtractedText.match(/Authorized by: ([^\n]+)/i);
        if (authorizedByMatch && authorizedByMatch[1]) {
          setResultAuthorizedBy(authorizedByMatch[1].trim());
        }
      }
      
      setIsDialogOpen(true);
    }
  };
    const handleSaveResult = () => {
    if (!selectedPatient || !resultType) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const newLabResult = {
      id: Date.now(),
      type: 'lab',
      patientId: selectedPatient,
      patientName: patients.find(p => p.id === selectedPatient)?.name,
      dateCreated: new Date().toISOString(),
      data: {
        testName: `${resultType} Test`,
        testType: resultType,
        status: 'Completed',
        results: resultNotes,
        notes: `Authorized by: ${resultAuthorizedBy}`
      },
      createdBy: resultAuthorizedBy || 'Unknown'
    };
    
    // Save to general lab results (for the main LabResults page)
    addLabResult({
      id: `lab-${Date.now()}`,
      patientId: selectedPatient,
      type: resultType,
      date: new Date().toISOString(),
      notes: resultNotes,
      resultUrl: null,
      authorizedBy: resultAuthorizedBy
    });
    
    // Also save to patient-specific localStorage (for PatientManagement page)
    if (selectedPatient) {
      const storageKey = `labresults_patient_${selectedPatient}`;
      const existing = localStorage.getItem(storageKey);
      const labResults = existing ? JSON.parse(existing) : [];
      labResults.push(newLabResult);
      localStorage.setItem(storageKey, JSON.stringify(labResults));
    }
    
    toast.success('Lab result added successfully');
      // If we came from patient management, navigate back
    if (showBackButton && patientId) {
      navigate(`/patients/${patientId}`);
      return;
    }
    
    setSelectedPatient('');
    setResultType('');
    setResultNotes('');
    setResultAuthorizedBy('');
    setOcrExtractedText(null);
    setMatchedPatientId(undefined);
    setAuthorizedBy(undefined);
    setIsDialogOpen(false);
  };
  
  const filteredResults = labResults.filter(result => {
    const patient = patients.find(p => p.id === result.patientId);
    const matchesSearch = 
      patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (result.authorizedBy && result.authorizedBy.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') {
      return matchesSearch;
    } else if (activeTab === 'recent') {
      const isRecent = new Date(result.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && isRecent;
    }
    
    return false;
  });

  const getPatientInitials = (patientId: string): string => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name.charAt(0) : '?';
  };
    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">          {showBackButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/patients/${patientId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {patientName || 'Patient'}
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Lab Results</h1>
            <p className="text-muted-foreground">
              {showBackButton && patientName 
                ? `Upload lab results for ${patientName}` 
                : 'View, manage, and analyze patient lab results'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Lab Results</CardTitle>
                  <CardDescription>Manage and view all laboratory results</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search results..."
                      className="pl-8 w-full md:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Result
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Lab Result</DialogTitle>
                        <DialogDescription>
                          Enter the details for the new lab result
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="patient">Patient</Label>
                          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger id="patient">
                              <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                            <SelectContent>
                              {patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Result Type</Label>
                          <Select value={resultType} onValueChange={setResultType}>
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Select result type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hematology">Hematology</SelectItem>
                              <SelectItem value="Chemistry">Chemistry</SelectItem>
                              <SelectItem value="Radiology">Radiology</SelectItem>
                              <SelectItem value="Microbiology">Microbiology</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="authorizedBy">Authorized By</Label>
                          <Input
                            id="authorizedBy"
                            value={resultAuthorizedBy}
                            onChange={(e) => setResultAuthorizedBy(e.target.value)}
                            placeholder="Enter doctor name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Result Notes</Label>
                          <textarea
                            id="notes"
                            className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Enter result details"
                            value={resultNotes}
                            onChange={(e) => setResultNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveResult}>Save Result</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Results</TabsTrigger>
                  <TabsTrigger value="recent">Recent (7 days)</TabsTrigger>
                </TabsList>                <TabsContent value="all" className="m-0">
                  <div className="space-y-4">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result) => {
                        const patient = patients.find(p => p.id === result.patientId);
                        return (
                          <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{getPatientInitials(result.patientId)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{patient?.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{result.type}</span>
                                  {result.authorizedBy && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                      {result.authorizedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm">{new Date(result.date).toLocaleDateString()}</div>
                              </div>
                              <Button size="sm" variant="outline">View</Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No lab results found. Add new results or adjust your search.
                      </div>
                    )}
                  </div>
                </TabsContent>                <TabsContent value="recent" className="m-0">
                  <div className="space-y-4">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result) => {
                        const patient = patients.find(p => p.id === result.patientId);
                        return (
                          <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{getPatientInitials(result.patientId)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{patient?.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{result.type}</span>
                                  {result.authorizedBy && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                      {result.authorizedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm">{new Date(result.date).toLocaleDateString()}</div>
                              </div>
                              <Button size="sm" variant="outline">View</Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent lab results found.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {!ocrExtractedText ? (
            <OcrScanner onScanComplete={handleOcrComplete} />
          ) : (
            <OcrResultDisplay 
              extractedText={ocrExtractedText}
              matchedPatientId={matchedPatientId}
              authorizedBy={authorizedBy}
              onEdit={handleEditAndAdd} 
            />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Quick Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-medium">OCR Scanning</h3>
                  <p className="text-muted-foreground">
                    Use the OCR scanner to quickly extract text from lab result images. The system will attempt to identify patient information and test results automatically.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Managing Results</h3>
                  <p className="text-muted-foreground">
                    After adding lab results, you can view, edit, or print them from the patient's record. Results are also accessible from the patient's profile.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Result Types</h3>
                  <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Hematology: Blood tests including CBC, coagulation</li>
                    <li>Chemistry: Metabolic panels, lipid profiles</li>
                    <li>Microbiology: Cultures, sensitivity tests</li>
                    <li>Radiology: X-rays, CT scans, MRIs</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LabResults;
