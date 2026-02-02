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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ENV } from "@/config/env";
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
  Trash2,
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
    undefined,
  );
  const [authorizedBy, setAuthorizedBy] = useState<string | undefined>(
    undefined,
  );
  const [extractedTestResults, setExtractedTestResults] = useState<
    LabTestResult[]
  >([]);
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [labResultToDelete, setLabResultToDelete] = useState<LabResult | null>(
    null,
  );

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
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - accept images and PDFs
    const isValidType =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isValidType) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, etc.) or PDF",
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
            authorizedBy: doctorName, // Pass the extracted doctor name
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
      /(?:Referring\s+Physician|Authorized\s*by|Attending\s+Physician)\s*:[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|DO|PhD|$)/is,
      /(?:Referring\s+Physician|Authorized\s*by)\s*:[\s\n\r]*([A-Za-z\s.]+?)(?:,|\n|MD|DO|$)/is,
      /(?:Verified\s+by)\s*:[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|DO|PhD|Pathologist|$)/is,
      /(?:Pathologist|Signed\s+by|Reported\s+by)\s*:[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|DO|$)/is,
      /(?:doctor|dr\.)\s*:?[\s\n\r]*([^\n\r]+)/i,
      /dr\.?\s+([A-Za-z\s.]+?)(?:,|\n|MD|DO|$)/i,
      /physician\s*:?[\s\n\r]*([^\n\r]+)/i,
    ];

    for (const pattern of doctorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let doctorName = match[1].trim();
        // Remove "Dr." prefix if captured
        doctorName = doctorName.replace(/^Dr\.?\s*/i, "");
        // Remove trailing credentials like ", MD" or job titles
        doctorName = doctorName.replace(
          /,\s*(MD|DO|PhD|DVM|Pathologist|Radiologist).*$/i,
          "",
        );
        // Clean up extra whitespace
        doctorName = doctorName.replace(/\s+/g, " ").trim();
        if (doctorName.length > 2 && doctorName.length < 50) {
          console.log(`Extracted doctor name: "${doctorName}"`);
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
    documentDetails?: any,
  ) => {
    console.log("OCR Complete called with:", {
      text: text.substring(0, 200),
      patientId,
      doctor,
      structuredDataLength: structuredData?.length,
    });
    console.log(
      "Available patients:",
      patients.map((p) => ({ id: p.id, name: p.name })),
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
          patientId,
        );
      } else {
        console.log(
          "OCR provided patient ID not found in current list:",
          patientId,
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
            foundPatientId,
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
        (p) => p.id === (finalPatientId || matchedPatientId),
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
      patients.map((p) => ({ id: p.id, name: p.name })),
    );

    // Helper function to detect doctor names
    const detectDoctorName = (text: string): string | null => {
      const doctorPatterns = [
        /(?:Referring\s+Physician|Attending\s+Physician):[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|DO|$)/gis,
        /(?:Referring\s+Physician|Attending\s+Physician):[\s\n\r]*([A-Za-z\s.]+?)(?:,|\n|MD|$)/gis,
        /(?:Verified\s+by|Signed\s+by|Reported\s+by):[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|DO|PhD|Pathologist|$)/gis,
        /(?:Pathologist|Radiologist):[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|DO|$)/gis,
        /(?:Dr\.?\s+|Doctor\s+|Physician\s+)([A-Za-z\s.]+?)(?:,|\n|MD|DO|$)/gi,
        /(?:Authorized\s+by|Attending|Consultant):[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|$)/gis,
        /(?:Signature|Signed):[\s\n\r]*Dr\.?\s*([A-Za-z\s.]+?)(?:,|\n|MD|$)/gis,
      ];

      for (const pattern of doctorPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          if (match[1]) {
            let name = match[1].trim();
            // Remove "Dr." prefix if captured
            name = name.replace(/^Dr\.?\s*/i, "");
            // Remove trailing credentials like ", MD" or job titles
            name = name.replace(
              /,\s*(MD|DO|PhD|DVM|Pathologist|Radiologist).*$/i,
              "",
            );
            // Clean up extra whitespace
            name = name.replace(/\s+/g, " ").trim();
            if (
              name.length >= 4 &&
              name.length <= 50 &&
              /^[A-Za-z\s.]+$/.test(name)
            ) {
              console.log(`Detected doctor name: "${name}"`);
              return name;
            }
          }
        }
      }
      return null;
    };

    // Helper function to detect patient names with context validation
    const detectPatientName = (
      text: string,
    ): { name: string; confidence: number }[] => {
      const results: { name: string; confidence: number }[] = [];
      const lines = text.split("\n");

      // Detect doctor to exclude from patient matching
      const doctorName = detectDoctorName(text);
      console.log("Detected doctor name:", doctorName);

      // First, prioritize exact "Name: " pattern (highest confidence)
      const namePattern = /\bName\s*:\s*([A-Za-z\s.'-]+)/gi;
      const nameMatches = [...text.matchAll(namePattern)];

      console.log(`Found ${nameMatches.length} "Name: " pattern matches`);

      for (const match of nameMatches) {
        if (match[1]) {
          let extractedName = match[1].trim();
          console.log(`Traced "Name: " -> "${extractedName}"`);

          // Normalize name: Remove extra spaces and standardize format
          extractedName = extractedName.replace(/\s+/g, " ");

          // Validate extracted name
          if (
            extractedName.length >= 3 &&
            extractedName.length <= 50 &&
            /^[A-Za-z\s.'-]+$/.test(extractedName)
          ) {
            // Exclude medical terms
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
              results.push({ name: extractedName, confidence: 0.95 }); // Highest confidence
              console.log(
                `Added from "Name: " pattern: "${extractedName}" (confidence: 0.95)`,
              );
            }
          }
        }
      }

      // Then try other patterns with lower confidence
      const otherPatientPatterns = [
        {
          pattern: /(?:Patient\s+Name)\s*:\s*([A-Za-z\s.'-]+)/gi,
          confidence: 0.9,
        },
        { pattern: /(?:Patient)\s*:\s*([A-Za-z\s.'-]+)/gi, confidence: 0.8 },
        {
          pattern: /^(?:Mr\.?|Mrs\.?|Ms\.?|Miss)\s+([A-Za-z\s.'-]+)/gim,
          confidence: 0.7,
        },
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

        // Extract names using other patterns (lower priority than "Name: ")
        for (const { pattern, confidence } of otherPatientPatterns) {
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
                    `Extracted potential patient name: "${extractedName}" (confidence: ${confidence})`,
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

    // Sort by confidence (highest first) and try to match
    detectedNames.sort((a, b) => b.confidence - a.confidence);

    console.log("Detected names sorted by confidence:", detectedNames);

    // Helper function to calculate string similarity (Levenshtein-based)
    const calculateSimilarity = (str1: string, str2: string): number => {
      // Normalize: convert to lowercase, remove extra spaces, handle periods in initials
      const normalize = (s: string) =>
        s.toLowerCase().replace(/\s+/g, " ").replace(/\./g, "").trim();
      const s1 = normalize(str1);
      const s2 = normalize(str2);

      if (s1 === s2) return 1.0;

      const len1 = s1.length;
      const len2 = s2.length;
      const maxLen = Math.max(len1, len2);

      if (maxLen === 0) return 1.0;

      // Simple Levenshtein distance
      const matrix: number[][] = [];

      for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + cost, // substitution
          );
        }
      }

      const distance = matrix[len1][len2];
      return 1 - distance / maxLen;
    };

    // Try to find the best match for each detected name
    for (const { name: detectedName, confidence } of detectedNames) {
      if (confidence < 0.6) {
        console.log(
          `Skipping low confidence name: "${detectedName}" (${confidence})`,
        );
        continue;
      }

      console.log(
        `Trying to match detected name: "${detectedName}" (confidence: ${confidence})`,
      );

      let bestMatch: { patient: any; similarity: number } | null = null;

      for (const patient of patients) {
        const patientNameUpper = patient.name.toUpperCase();
        const detectedNameUpper = detectedName.toUpperCase();

        // Priority 1: Exact match (highest priority)
        if (detectedNameUpper === patientNameUpper) {
          console.log(
            `✓ Found exact match: ${patient.name} (ID: ${patient.id})`,
          );
          return patient.id;
        }

        // Priority 2: Calculate similarity score for fuzzy matching
        const similarity = calculateSimilarity(detectedName, patient.name);

        console.log(
          `  Comparing "${detectedName}" with "${
            patient.name
          }" -> similarity: ${(similarity * 100).toFixed(1)}%`,
        );

        // Keep track of the best match
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { patient, similarity };
        }

        // Priority 3: Contains match with validation (for partial names)
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
              detectedParts.some(
                (dp) => dp.includes(part) || part.includes(dp),
              ),
          );

          if (commonParts.length >= Math.min(2, nameParts.length)) {
            console.log(
              `✓ Found validated contains match: ${patient.name} (ID: ${patient.id})`,
            );
            return patient.id;
          }
        }
      }

      // If we have a high-similarity match (80% or higher), use it
      if (bestMatch && bestMatch.similarity >= 0.8) {
        console.log(
          `✓ Found best fuzzy match: ${bestMatch.patient.name} (ID: ${
            bestMatch.patient.id
          }, similarity: ${(bestMatch.similarity * 100).toFixed(1)}%)`,
        );
        return bestMatch.patient.id;
      } else if (bestMatch) {
        console.log(
          `  Best match found but similarity too low: ${
            bestMatch.patient.name
          } (${(bestMatch.similarity * 100).toFixed(1)}%)`,
        );
      }
    }

    console.log("No patient match found after enhanced validation");
    return undefined;
  };

  // Function to handle viewing lab result - generate logo-free PDF
  const handleViewLabResult = async (result: LabResult) => {
    try {
      // Call the download_pdf endpoint to get logo-free PDF
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${ENV.API_URL.replace("/api", "")}/api/medical-documents/lab-results/${
          result.id
        }/download_pdf/`,
        {
          method: "GET",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        },
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/pdf")) {
          // Direct PDF response - create blob and open
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          window.open(pdfUrl, "_blank");

          // Clean up the blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
        } else {
          // JSON response with PDF URL (fallback behavior)
          const data = await response.json();
          if (data.pdf_url) {
            window.open(data.pdf_url, "_blank");
          } else {
            throw new Error("No PDF URL received from server");
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);

      // Fallback to original URL if available
      if (result.resultUrl) {
        console.log("Falling back to original PDF URL");
        window.open(result.resultUrl, "_blank");
      } else {
        toast({
          title: "PDF Not Available",
          description:
            "Failed to generate logo-free PDF. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  // Function to handle deleting lab result
  const handleDeleteLabResult = async (result: LabResult) => {
    setLabResultToDelete(result);
    setDeleteConfirmOpen(true);
  };

  // Function to confirm and execute deletion
  const confirmDeleteLabResult = async () => {
    if (!labResultToDelete) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${ENV.API_URL.replace("/api", "")}/api/medical-documents/lab-results/${
          labResultToDelete.id
        }/`,
        {
          method: "DELETE",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        },
      );

      if (response.ok) {
        toast({
          title: "Lab Result Deleted",
          description: `Lab result for ${
            labResultToDelete.patientName || "patient"
          } has been deleted successfully.`,
        });

        // Refresh the lab results list
        if (fetchLabResults) {
          await fetchLabResults();
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting lab result:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete lab result. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setLabResultToDelete(null);
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

  // Helper function to check if a lab result's patient is archived
  const isLabResultPatientArchived = (result: LabResult): boolean => {
    if (!Array.isArray(patients) || patients.length === 0) {
      return false;
    }
    // Find patient by name
    const patient = patients.find((p) => {
      const patientName = (p.name || '').toLowerCase().trim();
      const resultPatientName = (result.patientName || '').toLowerCase().trim();
      return patientName === resultPatientName;
    });
    return patient?.is_deleted === true;
  };

  const filteredResults = labResults
    .filter((result) => {
      // Exclude archived patients
      if (isLabResultPatientArchived(result)) {
        return false;
      }

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
                test.reference_range.toLowerCase().includes(searchLower)),
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Lab Results List</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            View, manage, and analyze patient lab results
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto text-sm"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Lab Result
              </>
            )}
          </Button>
          <span className="text-[10px] sm:text-xs text-gray-500 italic">
            PDF, PNG, JPG only
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search results..."
                      className="pl-8 w-full sm:w-[200px] text-xs sm:text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Date {getSortIcon("date")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort("patient")}
                      className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Patient {getSortIcon("patient")}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshResults}
                    disabled={isLoadingResults}
                    className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isLoadingResults ? "animate-spin" : ""
                      }`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
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
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium text-sm sm:text-base">
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
                                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
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
                                <div className="sm:hidden text-xs text-muted-foreground mt-2">
                                  {new Date(result.date).toLocaleDateString()}
                                </div>
                                {result.notes && (
                                  <div className="text-xs text-muted-foreground mt-1 truncate max-w-full sm:max-w-md">
                                    {result.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                              <div className="text-left sm:text-right hidden sm:block">
                                <div className="text-xs sm:text-sm font-medium">
                                  {new Date(result.date).toLocaleDateString()}
                                </div>
                                {(result as any).reportedDate &&
                                  (result as any).reportedDate !==
                                    result.date && (
                                    <div className="text-xs text-muted-foreground">
                                      Reported:{" "}
                                      {new Date(
                                        (result as any).reportedDate,
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewLabResult(result)}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteLabResult(result)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium text-sm sm:text-base">
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
                                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
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
                                <div className="sm:hidden text-xs text-muted-foreground mt-2">
                                  {new Date(result.date).toLocaleDateString()} •{" "}
                                  {Math.floor(
                                    (Date.now() -
                                      new Date(result.date).getTime()) /
                                      (1000 * 60 * 60 * 24),
                                  )}{" "}
                                  days ago
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                              <div className="text-left sm:text-right hidden sm:block">
                                <div className="text-xs sm:text-sm font-medium">
                                  {new Date(result.date).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.floor(
                                    (Date.now() -
                                      new Date(result.date).getTime()) /
                                      (1000 * 60 * 60 * 24),
                                  )}{" "}
                                  days ago
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewLabResult(result)}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteLabResult(result)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 py-4 border-t">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show
                    </p>
                    <Select
                      value={resultsPerPage.toString()}
                      onValueChange={handleResultsPerPageChange}
                    >
                      <SelectTrigger className="h-8 w-14 sm:w-16 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-4 lg:space-x-6">
                    <div className="flex w-[100px] items-center justify-center text-xs sm:text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OCR Processing Dialog */}
      <Dialog
        open={isProcessing || ocrExtractedText !== null}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            startNewScan();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              AWS Textract Document Scanner
            </DialogTitle>
            <DialogDescription>
              {isProcessing
                ? "Processing document with AWS Textract..."
                : "Document processed successfully. Review and manage extracted data."}
            </DialogDescription>
          </DialogHeader>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Processing document with AWS Textract...
              </p>
              {uploadedFile && (
                <p className="text-xs text-muted-foreground">
                  File: {uploadedFile.name}
                </p>
              )}
            </div>
          ) : ocrExtractedText ? (
            <div className="space-y-4">
              {/* Status indicators */}
              <div className="space-y-3">
                {/* Backend connectivity status */}
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    backendConnected ? "bg-green-50" : "bg-orange-50"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      backendConnected ? "bg-green-500" : "bg-orange-500"
                    }`}
                  ></div>
                  <span
                    className={`text-sm font-medium ${
                      backendConnected ? "text-green-800" : "text-orange-800"
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
                        {patients.find((p) => p.id === matchedPatientId)?.name}
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
              </div>

              {/* OCR Visualizer Component */}
              <OCRVisualizer
                blocks={processedBlocks}
                uploadedFile={uploadedFile}
                extractedText={ocrExtractedText || ""}
                editableText={ocrExtractedText || ""}
                onTextChange={() => {}}
                visualizationData={visualizationData}
              />

              {/* Action buttons */}
              <div className="flex justify-between pt-4 border-t">
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

                <div className="flex gap-2">
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
                  <Button onClick={startNewScan}>
                    <Upload className="h-4 w-4 mr-2" />
                    New Scan
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab Result</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the lab result for{" "}
              <span className="font-semibold">
                {labResultToDelete?.patientName || "this patient"}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmOpen(false);
                setLabResultToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLabResult}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LabResults;
