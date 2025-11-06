import { processLabResult } from "@/api/labResultProcessor";
import { checkBackendHealth } from "@/api/textract";
import ExportButton from "@/components/ExportButton";
import OCRVisualizer from "@/components/OCRVisualizer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClinic } from "@/contexts/ClinicContext";
import { toast } from "@/hooks/use-toast";
import { type LabResult } from "@/lib/mock-data";
import { type LabTestResult } from "@/services/medicalDocumentsAPI";
import {
  Edit,
  FileText,
  Image,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// AWS Textract configuration is now handled by environment variables
// or backend configuration

// Textract block types and interfaces
interface TextractBlock {
  BlockType: string;
  Id: string;
  Text?: string;
  Geometry: {
    BoundingBox: {
      Left: number;
      Top: number;
      Width: number;
      Height: number;
    };
  };
  Relationships?: Array<{
    Type: string;
    Ids: string[];
  }>;
}

// Local interfaces for this component - updated to match API structure
interface LocalLabTestResult {
  test_name: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  status?: "normal" | "abnormal" | "critical";
}

interface LocalCreateLabResultRequest {
  patient: string;
  authorized_by?: string;
  title: string;
  description: string;
  content: string;
  document_date: string;
  status: string;
  urgency: string;
  test_name: string;
  test_category: string;
  specimen_type: string;
  laboratory_name: string;
  collection_date: string;
  received_date: string;
  reported_date: string;
  test_results: LabTestResult[];
  interpretation: string;
  processing_notes: string;
}

const LabResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    patients,
    labResults,
    users,
    addLabResult,
    fetchPatients,
    fetchLabResults,
    currentUser,
  } = useClinic();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortField, setSortField] = useState<"date" | "patient">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);

  const [ocrExtractedText, setOcrExtractedText] = useState<string | null>(null);
  const [matchedPatientId, setMatchedPatientId] = useState<string | undefined>(
    undefined
  );
  const [authorizedBy, setAuthorizedBy] = useState<string | undefined>(
    undefined
  );
  const [extractedTestResults, setExtractedTestResults] = useState<
    LabTestResult[]
  >([]);
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Textract specific states
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processedBlocks, setProcessedBlocks] = useState<TextractBlock[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendType, setBackendType] = useState<string>("None");
  // Add state for visualization data
  const [visualizationData, setVisualizationData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend connectivity and fetch data
  React.useEffect(() => {
    const initializeData = async () => {
      if (fetchPatients) {
        await fetchPatients();
      }

      // Fetch lab results
      if (fetchLabResults) {
        setIsLoadingResults(true);
        try {
          await fetchLabResults();
        } catch (error) {
          console.error("Error loading lab results:", error);
        } finally {
          setIsLoadingResults(false);
        }
      }

      // Check backend connectivity
      checkBackendHealth().then((result) => {
        setBackendConnected(result.connected);
        setBackendType(result.backend);
      });
    };

    initializeData();
  }, [fetchPatients, fetchLabResults]);

  // Handle return from DocumentComparison page
  React.useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.processCompleted && state.correctedText) {
        // Set the corrected text
        setOcrExtractedText(state.correctedText);

        // Set the original file if available
        if (state.originalFile) {
          setUploadedFile(state.originalFile);
        }

        // Set patient if available
        if (state.patientId) {
          setMatchedPatientId(state.patientId);
        }

        toast({
          title: "Document Updated",
          description: "Corrected text has been loaded successfully.",
        });

        // Clear the state to prevent re-triggering
        navigate("/lab-results", { replace: true });
      }
    }
  }, [location.state, navigate]);

  // Handle file upload and processing
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      // Process with our new lab result processor
      const result = await processLabResult(file);

      if (result.error) {
        throw new Error(result.error);
      }

      // Set the extracted text
      const extractedText = result.text;
      setOcrExtractedText(extractedText);

      // Set visualization data if available
      if (result.visualizationData) {
        setProcessedBlocks(result.visualizationData.blocks);
        setVisualizationData(result.visualizationData);
      }

      // Extract patient and doctor information
      const patientId = findPatientFromText(extractedText);
      if (patientId) {
        setMatchedPatientId(patientId);
        const patient = patients.find((p) => p.id === patientId);
        if (patient) {
          toast({
            title: "Patient Identified",
            description: `Automatically identified: ${patient.name}`,
          });
        }
      }

      // Extract doctor information
      const doctorName = extractDoctorName(extractedText);
      if (doctorName) {
        setAuthorizedBy(doctorName);
      }

      // Extract test results
      const testResults = extractTestResults(extractedText);
      setExtractedTestResults(testResults);

      toast({
        title: "Document Processed",
        description: "Text extracted successfully using AWS Textract",
      });

      // Navigate to document comparison page
      setTimeout(() => {
        navigate("/document-comparison", {
          state: {
            originalFile: file,
            extractedText: extractedText,
            visualizationData: result.visualizationData,
            patientId: patientId,
            patientName: patientId
              ? patients.find((p) => p.id === patientId)?.name
              : undefined,
            returnPath: "/lab-results",
          },
        });
      }, 1000); // Brief delay to show the toast
    } catch (error) {
      console.error("Error processing document:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to process document. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage =
            "Cannot connect to processing server. Using offline mode with sample data.";
        } else {
          errorMessage = `Processing error: ${error.message}`;
        }
      }

      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract doctor name from text
  const extractDoctorName = (text: string): string | undefined => {
    const doctorPatterns = [
      /(?:authorized\s*by|doctor|dr\.?)\s*:?\s*([^\n\r]+)/i,
      /dr\.?\s+([a-z\s]+)/i,
      /physician\s*:?\s*([^\n\r]+)/i,
    ];

    for (const pattern of doctorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const doctorName = match[1].trim();
        if (doctorName.length > 2 && doctorName.length < 50) {
          return doctorName;
        }
      }
    }
    return undefined;
  };

  // Extract test results from text
  const extractTestResults = (text: string): LabTestResult[] => {
    const results: LabTestResult[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
      // Look for patterns like "Test Name: Value Unit (Reference Range)"
      const testPattern =
        /([A-Za-z\s]+):\s*([0-9.]+)\s*([A-Za-z/%]*)\s*\(([^)]+)\)/;
      const match = line.match(testPattern);

      if (match) {
        results.push({
          test_name: match[1].trim(),
          result_value: match[2].trim(),
          unit: match[3].trim() || undefined,
          reference_range: match[4].trim() || undefined,
          status: undefined,
        });
      }
    }

    return results;
  };

  // Reset form function
  const resetForm = () => {
    setOcrExtractedText(null);
    setMatchedPatientId(undefined);
    setAuthorizedBy(undefined);
    setExtractedTestResults([]);
    setDocumentDetails(null);
    setUploadedFile(null);
    setProcessedBlocks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Start new scan
  const startNewScan = () => {
    resetForm();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle OCR completion (updated for Textract integration)
  const handleOcrComplete = (
    text: string,
    patientId?: string,
    doctor?: string,
    structuredData?: LabTestResult[],
    documentDetails?: any
  ) => {
    console.log("OCR Complete called with:", {
      text: text.substring(0, 200),
      patientId,
      doctor,
      structuredDataLength: structuredData?.length,
    });
    console.log(
      "Available patients:",
      patients.map((p) => ({ id: p.id, name: p.name }))
    );

    setOcrExtractedText(text);

    // Store extracted test results and document details
    if (structuredData && structuredData.length > 0) {
      setExtractedTestResults(structuredData);
      console.log("Stored extracted test results:", structuredData);
    }

    if (documentDetails) {
      setDocumentDetails(documentDetails);
      console.log("Stored document details:", documentDetails);
    }

    // Enhanced patient matching logic with validation
    let finalPatientId = patientId;

    if (patientId) {
      // Verify the provided patient ID exists in current patient list
      const patientExists = patients.find((p) => p.id === patientId);
      if (patientExists) {
        setMatchedPatientId(patientId);
        console.log(
          "OCR matched patient verified:",
          patientExists.name,
          "ID:",
          patientId
        );
      } else {
        console.log(
          "OCR provided patient ID not found in current list:",
          patientId
        );
        finalPatientId = undefined;
      }
    }

    // If no valid patient ID from OCR, try enhanced text matching
    if (!finalPatientId && text) {
      const foundPatientId = findPatientFromText(text);
      if (foundPatientId) {
        const foundPatient = patients.find((p) => p.id === foundPatientId);
        if (foundPatient) {
          setMatchedPatientId(foundPatientId);
          console.log(
            "Found patient through enhanced text matching:",
            foundPatient.name,
            "ID:",
            foundPatientId
          );
        }
      }
    }

    // Set authorized by doctor
    if (doctor) {
      setAuthorizedBy(doctor);
      console.log("OCR extracted doctor:", doctor);
    }

    // Show success message if patient was matched
    if (finalPatientId || matchedPatientId) {
      const matchedPatient = patients.find(
        (p) => p.id === (finalPatientId || matchedPatientId)
      );
      if (matchedPatient) {
        toast({
          title: "Patient Identified",
          description: `Patient automatically identified: ${matchedPatient.name}`,
        });
      }
    }
  };

  // Enhanced patient matching function with doctor context exclusion
  const findPatientFromText = (text: string): string | undefined => {
    if (!patients || patients.length === 0) {
      console.log("No patients available for matching");
      return undefined;
    }

    const lines = text.split("\n");
    console.log("Searching for patient in text...");
    console.log(
      "Available patients:",
      patients.map((p) => ({ id: p.id, name: p.name }))
    );

    // Helper function to detect doctor names
    const detectDoctorName = (text: string): string | null => {
      const doctorPatterns = [
        /(?:Dr\.?\s+|Doctor\s+|Physician\s+)([A-Za-z\s]+)/gi,
        /(?:Authorized\s+by|Attending|Consultant):\s*Dr\.?\s*([A-Za-z\s]+)/gi,
        /(?:Signature|Signed):\s*Dr\.?\s*([A-Za-z\s]+)/gi,
      ];

      for (const pattern of doctorPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          if (match[1]) {
            const name = match[1].trim();
            if (
              name.length >= 4 &&
              name.length <= 30 &&
              /^[A-Za-z\s]+$/.test(name)
            ) {
              return name;
            }
          }
        }
      }
      return null;
    };

    // Helper function to detect patient names with context validation
    const detectPatientName = (
      text: string
    ): { name: string; confidence: number }[] => {
      const results: { name: string; confidence: number }[] = [];
      const lines = text.split("\n");

      // Detect doctor to exclude from patient matching
      const doctorName = detectDoctorName(text);
      console.log("Detected doctor name:", doctorName);

      const patientPatterns = [
        {
          pattern: /(?:Patient\s+Name|Name)\s*:\s*([A-Za-z\s]+)/gi,
          confidence: 0.9,
        },
        { pattern: /(?:Patient)\s*:\s*([A-Za-z\s]+)/gi, confidence: 0.8 },
        {
          pattern: /^(?:Mr\.?|Mrs\.?|Ms\.?|Miss)\s+([A-Za-z\s]+)/gim,
          confidence: 0.7,
        },
        { pattern: /Name\s*:\s*([A-Za-z\s]+)/gi, confidence: 0.6 },
      ];

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip lines that contain doctor indicators
        const doctorIndicators = [
          /(?:Dr\.?|Doctor|Physician|Attending|Consultant|Authorized\s+by|Signature|Signed)/i,
          /(?:Laboratory|Lab|Pathology|Medical|Center|Centre|Hospital)/i,
        ];

        if (doctorIndicators.some((indicator) => indicator.test(trimmedLine))) {
          continue;
        }

        // Extract names using patterns
        for (const { pattern, confidence } of patientPatterns) {
          const matches = [...trimmedLine.matchAll(pattern)];
          for (const match of matches) {
            if (match[1]) {
              const extractedName = match[1].trim();

              // Validate extracted name
              if (
                extractedName.length >= 3 &&
                extractedName.length <= 40 &&
                /^[A-Za-z\s]+$/.test(extractedName)
              ) {
                // Exclude medical terms and doctor name
                const medicalTerms = [
                  "pathology",
                  "laboratory",
                  "medical",
                  "center",
                  "centre",
                  "hospital",
                  "clinic",
                  "health",
                  "lab",
                  "report",
                  "test",
                  "result",
                  "analysis",
                  "department",
                  "service",
                  "group",
                ];

                const nameToCheck = extractedName.toLowerCase();
                const isDoctorName =
                  doctorName &&
                  (nameToCheck.includes(doctorName.toLowerCase()) ||
                    doctorName.toLowerCase().includes(nameToCheck));

                if (
                  !medicalTerms.some((term) => nameToCheck.includes(term)) &&
                  !isDoctorName
                ) {
                  results.push({ name: extractedName, confidence });
                  console.log(
                    `Extracted potential patient name: "${extractedName}" (confidence: ${confidence})`
                  );
                }
              }
            }
          }
        }
      }

      return results;
    };

    // Get potential patient names with confidence scores
    const detectedNames = detectPatientName(text);

    if (detectedNames.length === 0) {
      console.log("No potential patient names detected");
      return undefined;
    }

    // Sort by confidence and try to match
    detectedNames.sort((a, b) => b.confidence - a.confidence);

    for (const { name: detectedName, confidence } of detectedNames) {
      if (confidence < 0.6) continue; // Skip low confidence matches

      console.log(
        `Trying to match detected name: "${detectedName}" (confidence: ${confidence})`
      );

      for (const patient of patients) {
        const patientNameUpper = patient.name.toUpperCase();
        const detectedNameUpper = detectedName.toUpperCase();

        // Exact match (highest priority)
        if (detectedNameUpper === patientNameUpper) {
          console.log(`Found exact match: ${patient.name} (ID: ${patient.id})`);
          return patient.id;
        }

        // Contains match with validation
        if (
          detectedNameUpper.includes(patientNameUpper) ||
          patientNameUpper.includes(detectedNameUpper)
        ) {
          // Additional validation for contains matches
          const nameParts = patientNameUpper.split(" ");
          const detectedParts = detectedNameUpper.split(" ");

          // Ensure significant overlap
          const commonParts = nameParts.filter(
            (part) =>
              part.length > 2 &&
              detectedParts.some((dp) => dp.includes(part) || part.includes(dp))
          );

          if (commonParts.length >= Math.min(2, nameParts.length)) {
            console.log(
              `Found validated contains match: ${patient.name} (ID: ${patient.id})`
            );
            return patient.id;
          }
        }
      }
    }

    console.log("No patient match found after enhanced validation");
    return undefined;
  };

  // Function to handle viewing lab result - directly open PDF
  const handleViewLabResult = (result: LabResult) => {
    if (result.resultUrl) {
      // Open PDF in new window/tab
      window.open(result.resultUrl, "_blank");
    } else {
      // If no PDF URL, try to fetch it from the API
      console.log("No PDF URL available for lab result:", result.id);
      toast({
        title: "PDF Not Available",
        description:
          "The PDF file for this lab result is not currently available.",
        variant: "destructive",
      });
    }
  };

  // Function to handle sorting
  const handleSort = (field: "date" | "patient") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Function to get sort icon
  const getSortIcon = (field: "date" | "patient") => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const filteredResults = labResults
    .filter((result) => {
      // Enhanced search functionality across multiple fields
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (result.patientName &&
          result.patientName.toLowerCase().includes(searchLower)) ||
        result.type.toLowerCase().includes(searchLower) ||
        (result.authorizedBy &&
          result.authorizedBy.toLowerCase().includes(searchLower)) ||
        (result.notes && result.notes.toLowerCase().includes(searchLower)) ||
        ((result as any).laboratoryName &&
          (result as any).laboratoryName.toLowerCase().includes(searchLower)) ||
        ((result as any).specimenType &&
          (result as any).specimenType.toLowerCase().includes(searchLower)) ||
        new Date(result.date)
          .toLocaleDateString()
          .toLowerCase()
          .includes(searchLower) ||
        // Search within structured test data
        (result.structuredData &&
          result.structuredData.some(
            (test) =>
              test.test_name.toLowerCase().includes(searchLower) ||
              test.result_value.toLowerCase().includes(searchLower) ||
              (test.unit && test.unit.toLowerCase().includes(searchLower)) ||
              (test.reference_range &&
                test.reference_range.toLowerCase().includes(searchLower))
          ));

      if (activeTab === "all") {
        return matchesSearch;
      } else if (activeTab === "recent") {
        const isRecent =
          new Date(result.date) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return matchesSearch && isRecent;
      }

      return false;
    })
    .sort((a, b) => {
      // Apply sorting
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "patient":
          aValue = (a.patientName || "Unknown Patient").toLowerCase();
          bValue = (b.patientName || "Unknown Patient").toLowerCase();
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Pagination calculations
  const filteredCount = filteredResults.length;
  const totalPages = Math.ceil(filteredCount / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const paginatedResults = filteredResults.slice(startIndex, endIndex);

  // Reset current page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleResultsPerPageChange = (value: string) => {
    setResultsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Helper function to refresh lab results
  const handleRefreshResults = async () => {
    if (fetchLabResults) {
      setIsLoadingResults(true);
      try {
        await fetchLabResults();
        toast({
          title: "Results Updated",
          description: "Lab results have been refreshed successfully.",
        });
      } catch (error) {
        console.error("Error refreshing lab results:", error);
        toast({
          title: "Refresh Failed",
          description: "Failed to refresh lab results. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingResults(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lab Results</h1>
        <p className="text-muted-foreground">
          View, manage, and analyze patient lab results
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Lab Results</CardTitle>
                  <CardDescription>
                    Manage and view all laboratory results
                  </CardDescription>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1"
                    >
                      Date {getSortIcon("date")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort("patient")}
                      className="flex items-center gap-1"
                    >
                      Patient {getSortIcon("patient")}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleRefreshResults}
                    disabled={isLoadingResults}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isLoadingResults ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredCount)}{" "}
                  of {filteredCount} results{" "}
                  {searchTerm && `for "${searchTerm}"`}
                  {searchTerm && ` for "${searchTerm}"`}
                </div>
                <div>
                  Sorted by {sortField} (
                  {sortDirection === "asc" ? "ascending" : "descending"})
                </div>
              </div>
              <Tabs
                defaultValue="all"
                onValueChange={(value) => setActiveTab(value)}
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Results</TabsTrigger>
                  <TabsTrigger value="recent">Recent (7 days)</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="m-0">
                  <div className="space-y-4">
                    {isLoadingResults ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">
                          Loading lab results...
                        </span>
                      </div>
                    ) : paginatedResults.length > 0 ? (
                      paginatedResults.map((result) => {
                        const hasAbnormal =
                          result.summary &&
                          (result.summary.abnormalCount > 0 ||
                            result.summary.criticalCount > 0);
                        const hasCritical =
                          result.summary && result.summary.criticalCount > 0;

                        return (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">
                                    {result.patientName || "Unknown Patient"}
                                  </div>
                                  {hasCritical && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Critical
                                    </span>
                                  )}
                                  {hasAbnormal && !hasCritical && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Abnormal
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {result.type}
                                  </span>
                                  {(result as any).laboratoryName && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                      {(result as any).laboratoryName}
                                    </span>
                                  )}
                                  {result.authorizedBy && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                      Dr. {result.authorizedBy}
                                    </span>
                                  )}
                                  {result.summary && (
                                    <span className="text-xs text-muted-foreground">
                                      {result.summary.totalTests} test
                                      {result.summary.totalTests !== 1
                                        ? "s"
                                        : ""}
                                    </span>
                                  )}
                                </div>
                                {result.notes && (
                                  <div className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                                    {result.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {new Date(result.date).toLocaleDateString()}
                                </div>
                                {(result as any).reportedDate &&
                                  (result as any).reportedDate !==
                                    result.date && (
                                    <div className="text-xs text-muted-foreground">
                                      Reported:{" "}
                                      {new Date(
                                        (result as any).reportedDate
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewLabResult(result)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : filteredCount > 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No results on this page. Try a different page or adjust
                        your search.
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchTerm
                          ? `No lab results found matching "${searchTerm}". Try adjusting your search terms.`
                          : "No lab results found. Upload new results or check your connection."}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="recent" className="m-0">
                  <div className="space-y-4">
                    {isLoadingResults ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">
                          Loading recent results...
                        </span>
                      </div>
                    ) : paginatedResults.length > 0 ? (
                      paginatedResults.map((result) => {
                        const hasAbnormal =
                          result.summary &&
                          (result.summary.abnormalCount > 0 ||
                            result.summary.criticalCount > 0);
                        const hasCritical =
                          result.summary && result.summary.criticalCount > 0;

                        return (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">
                                    {result.patientName || "Unknown Patient"}
                                  </div>
                                  {hasCritical && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Critical
                                    </span>
                                  )}
                                  {hasAbnormal && !hasCritical && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Abnormal
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {result.type}
                                  </span>
                                  {(result as any).laboratoryName && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                      {(result as any).laboratoryName}
                                    </span>
                                  )}
                                  {result.authorizedBy && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                      Dr. {result.authorizedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {new Date(result.date).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.floor(
                                    (Date.now() -
                                      new Date(result.date).getTime()) /
                                      (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days ago
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewLabResult(result)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : filteredCount > 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No results on this page. Try a different page.
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent lab results found from the last 7 days.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Pagination Controls */}
              {filteredCount > 0 && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Show</p>
                    <Select
                      value={resultsPerPage.toString()}
                      onValueChange={handleResultsPerPageChange}
                    >
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
                    <p className="text-sm text-muted-foreground">entries</p>
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

        <div className="space-y-6">
          {!ocrExtractedText ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  AWS Textract Document Scanner
                </CardTitle>
                <CardDescription>
                  Upload lab result images for advanced text extraction using
                  AWS Textract
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Processing document with AWS Textract...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload lab result image
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
                {uploadedFile && (
                  <div className="text-sm text-muted-foreground">
                    <strong>File:</strong> {uploadedFile.name}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Status indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Processing Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Backend connectivity status */}
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      backendConnected
                        ? "bg-green-50"
                        : "bg-orange-50"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        backendConnected ? "bg-green-500" : "bg-orange-500"
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        backendConnected
                          ? "text-green-800"
                          : "text-orange-800"
                      }`}
                    >
                      Backend:{" "}
                      {backendConnected
                        ? `${backendType} Connected`
                        : "Using Simulation Mode"}
                    </span>
                  </div>

                  {matchedPatientId && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">
                          Patient Identified:{" "}
                          {
                            patients.find((p) => p.id === matchedPatientId)
                              ?.name
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {authorizedBy && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-800">
                          Doctor Identified: {authorizedBy}
                        </span>
                      </div>
                    </div>
                  )}

                  {extractedTestResults.length > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-purple-800">
                          {extractedTestResults.length} Test Result(s) Extracted
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={startNewScan}>
                      <Upload className="h-4 w-4 mr-2" />
                      New Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* OCR Visualizer Component */}
              <OCRVisualizer
                blocks={processedBlocks}
                uploadedFile={uploadedFile}
                extractedText={ocrExtractedText || ""}
                editableText={ocrExtractedText || ""}
                onTextChange={() => {}}
                visualizationData={visualizationData}
              />

              {/* Export Button for lab results */}
              {ocrExtractedText && (
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (uploadedFile && ocrExtractedText) {
                        navigate("/document-comparison", {
                          state: {
                            originalFile: uploadedFile,
                            extractedText: ocrExtractedText,
                            visualizationData: visualizationData,
                            patientId: matchedPatientId,
                            patientName: matchedPatientId
                              ? patients.find((p) => p.id === matchedPatientId)
                                  ?.name
                              : undefined,
                            returnPath: "/lab-results",
                          },
                        });
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Review & Edit Text
                  </Button>

                  <ExportButton
                    text={ocrExtractedText || ""}
                    visualizationData={visualizationData}
                    filename={
                      uploadedFile
                        ? uploadedFile.name.replace(/\.[^/.]+$/, "")
                        : "lab-result"
                    }
                    isDisabled={isProcessing}
                  />
                </div>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>AWS Textract Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-medium">Advanced OCR Scanning</h3>
                  <p className="text-muted-foreground">
                    Upload lab result images for advanced text extraction using
                    AWS Textract. The system automatically preserves document
                    layout and can detect tables and structured data.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Smart Patient Matching</h3>
                  <p className="text-muted-foreground">
                    The system automatically identifies patient names and doctor
                    information from lab reports, matching them against your
                    patient database for quick data entry.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Editable Results</h3>
                  <p className="text-muted-foreground">
                    After extraction, you can edit the text content before
                    saving. The system maintains the original formatting while
                    allowing corrections and additions.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Supported Formats</h3>
                  <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                    <li>JPEG, PNG, TIFF image formats</li>
                    <li>High-resolution scanned documents</li>
                    <li>Mobile phone camera captures</li>
                    <li>Multi-column lab reports</li>
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

