import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ENV } from "@/config/env";
import { useClinic } from "@/contexts/ClinicContext";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  FileText,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Stethoscope,
  User,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

// Type declaration for jsPDF
declare global {
  interface Window {
    jspdf?: any;
  }
}

interface DocumentComparisonState {
  originalFile: File;
  extractedText: string;
  visualizationData?: any;
  patientId?: string;
  patientName?: string;
  returnPath?: string;
}

// Auto-detection functions with improved precision
const detectPatientName = (text: string): string | null => {
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip lines that clearly indicate doctor/staff names
    const doctorIndicators = [
      "dr.",
      "doctor",
      "physician",
      "authorized by",
      "signed by",
      "attending",
      "consultant",
      "specialist",
      "md",
      "m.d.",
    ];
    const isDoctorLine = doctorIndicators.some((indicator) =>
      trimmed.toLowerCase().includes(indicator)
    );

    if (isDoctorLine) {
      continue;
    }

    // Look for patient-specific patterns with context
    const patterns = [
      /(?:patient\s*(?:name)?)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /(?:name\s*of\s*patient)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /patient[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+(?:DOB|Age|ID|Patient))/i,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();

        // Additional validation - avoid common medical terms
        const excludeTerms = [
          "report",
          "test",
          "result",
          "analysis",
          "laboratory",
          "medical",
          "health",
          "clinic",
        ];
        const hasExcludedTerm = excludeTerms.some((term) =>
          name.toLowerCase().includes(term)
        );

        if (!hasExcludedTerm && name.length > 3 && name.length < 50) {
          return name;
        }
      }
    }
  }

  return null;
};

const detectDoctorName = (text: string): string | null => {
  const lines = text.split("\n");
  console.log("Detecting doctor name from text...");

  // Enhanced patterns for doctor detection
  const patterns = [
    // Direct doctor patterns
    /(?:Dr\.?\s+|Doctor\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Physician\s*:?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,

    // Authorization patterns
    /(?:Authorized\s+by\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Signed\s+by\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Attending\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Consultant\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,

    // Medical degree patterns
    /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,]*M\.?D\.?/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,]*MBBS/gi,

    // Clinical role patterns
    /(?:Referring\s+(?:Dr\.?|Doctor|Physician)\s*:?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Primary\s+(?:Dr\.?|Doctor|Physician)\s*:?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Consulting\s+(?:Dr\.?|Doctor|Physician)\s*:?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,

    // Signature patterns
    /(?:Signature\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Report\s+by\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,

    // Lab-specific patterns
    /(?:Pathologist\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Radiologist\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:Laboratory\s+Director\s*:?\s*)(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  ];

  // Try each line with all patterns
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length < 5) continue; // Skip very short lines

    console.log("Checking line:", trimmedLine);

    for (const pattern of patterns) {
      // Reset regex for global flag
      pattern.lastIndex = 0;
      const match = pattern.exec(trimmedLine);

      if (match && match[1]) {
        const extractedName = match[1].trim();
        console.log(
          "Potential doctor match:",
          extractedName,
          "from pattern:",
          pattern.source
        );

        // Validate the extracted name
        if (isValidDoctorName(extractedName)) {
          // Don't add "Dr." prefix if already present in original text
          const finalName = extractedName.toLowerCase().startsWith("dr.")
            ? extractedName
            : `Dr. ${extractedName}`;
          console.log("Valid doctor name detected:", finalName);
          return finalName;
        }
      }
    }
  }

  console.log("No doctor name detected");
  return null;
};

// Helper function to validate doctor names
function isValidDoctorName(name: string): boolean {
  // Basic validation
  if (!name || name.length < 4 || name.length > 50) {
    return false;
  }

  // Must contain only letters, spaces, and periods
  if (!/^[A-Za-z\s.]+$/.test(name)) {
    return false;
  }

  // Must have at least first and last name (2 words minimum)
  const words = name.trim().split(/\s+/);
  if (words.length < 2) {
    return false;
  }

  // Exclude common non-name terms
  const excludeTerms = [
    "pathology",
    "laboratory",
    "medical",
    "center",
    "centre",
    "hospital",
    "clinic",
    "health",
    "department",
    "service",
    "report",
    "test",
    "result",
    "analysis",
    "specimen",
    "blood",
    "urine",
    "sample",
    "collection",
    "chemistry",
  ];

  const nameLower = name.toLowerCase();
  if (excludeTerms.some((term) => nameLower.includes(term))) {
    return false;
  }

  // Each word should be properly capitalized for a name
  return words.every((word) => {
    if (word.length === 0) return false;
    // Allow for initials (single letters) or properly capitalized names
    return (
      word.length === 1 ||
      /^[A-Z][a-z]+$/.test(word) ||
      word === "Dr." ||
      word === "MD"
    );
  });
}

// OCR text cleaning function to prevent excessive blank lines and preserve formatting
function cleanOcrText(text: string): string {
  // Heuristic: preserve line breaks, keep extra spaces for lines that look like headers/tables
  return text
    .split("\n")
    .map((line) => {
      // If line contains multiple columns (e.g., separated by 2+ spaces or tabs), preserve spacing
      if (/\s{2,}|\t/.test(line)) return line;
      // If line is all caps or looks like a section header, preserve spacing
      if (/^[A-Z0-9 .:-]+$/.test(line.trim()) && line.trim().length > 8)
        return line;
      // Otherwise, collapse multiple spaces to one
      return line.replace(/ {2,}/g, " ");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n"); // Prevent excessive blank lines
}

const DocumentComparison: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DocumentComparisonState;
  const { patients, users } = useClinic();

  // Text editing states
  const [editableText, setEditableText] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [isSaving, setSaving] = useState(false);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  // Fetch clinic settings function
  const fetchClinicSettings = async () => {
    try {
      const response = await fetch(`${ENV.API_URL}/clinic/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const data = await response.json();
      setClinicSettings(data);
      return data;
    } catch (error) {
      console.error("Error fetching clinic settings:", error);
      return {};
    }
  };

  // Fetch clinic settings on component mount
  useEffect(() => {
    fetchClinicSettings();
  }, []);

  // Viewing modal state - REMOVED (no longer needed)
  // const [showViewModal, setShowViewModal] = useState(false);

  // Auto-detection states
  const [detectedPatientName, setDetectedPatientName] = useState<string | null>(
    null
  );
  const [detectedDoctorName, setDetectedDoctorName] = useState<string | null>(
    null
  );
  const [autoDetectionResults, setAutoDetectionResults] = useState<{
    patient: boolean;
    doctor: boolean;
  }>({ patient: false, doctor: false });

  // Floating window position state
  const [floatingWindowPos, setFloatingWindowPos] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 384, height: 500 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState("");
  const [textareaHeight, setTextareaHeight] = useState(400);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  // Searchable combobox states
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  // Use refs for smooth real-time movement without lag
  const floatingWindowRef = useRef<HTMLDivElement>(null);
  const currentPosRef = useRef({ x: 16, y: 16 });
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  // Enhanced patient matching function with improved precision to avoid false positives
  const findPatientFromText = (
    text: string,
    detectedName?: string
  ): any | undefined => {
    if (!patients || patients.length === 0) {
      console.log("No patients available for matching");
      return undefined;
    }

    const textUpper = text.toUpperCase();
    const lines = text.split("\n");

    console.log("Searching for patient in text...");
    console.log("Text length:", text.length);
    console.log(
      "Available patients:",
      patients.map((p) => ({ id: p.id, name: p.name }))
    );

    // Extract potential patient names from structured lines with context validation
    const potentialNames: Array<{
      name: string;
      context: string;
      confidence: number;
    }> = [];

    // Add the detected name if provided
    if (detectedName) {
      potentialNames.push({
        name: detectedName.toUpperCase(),
        context: "detected",
        confidence: 0.8,
      });
    }

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for patient name patterns with context awareness
      const patientPatterns = [
        {
          pattern: /(?:patient\s*(?:name)?)\s*:?\s*([^\n\r,]+)/i,
          confidence: 0.9,
          context: "patient_label",
        },
        {
          pattern: /(?:name\s*of\s*patient)\s*:?\s*([^\n\r,]+)/i,
          confidence: 0.9,
          context: "patient_label",
        },
        {
          pattern: /(?:^|\s)(mr|mrs|ms)\.?\s+([a-z\s]+?)(?:\s|$|,)/i,
          confidence: 0.6,
          context: "title_prefix",
        },
        {
          pattern: /name\s*:\s*([^,\n\r]+)/i,
          confidence: 0.7,
          context: "name_field",
        },
      ];

      // Exclude lines that clearly indicate doctor/staff names
      const doctorIndicators = [
        "dr.",
        "doctor",
        "physician",
        "authorized by",
        "signed by",
        "attending",
        "consultant",
        "specialist",
        "md",
        "m.d.",
      ];
      const isDoctorLine = doctorIndicators.some((indicator) =>
        trimmed.toLowerCase().includes(indicator)
      );

      if (isDoctorLine) {
        console.log(`Skipping doctor line: ${trimmed}`);
        continue;
      }

      for (const { pattern, confidence, context } of patientPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          let extractedName = match[1] || match[2];
          if (extractedName) {
            extractedName = extractedName.trim();

            // Filter out lab/medical terms and common false positives
            const excludeTerms = [
              "pathology",
              "medical",
              "centre",
              "center",
              "laboratory",
              "lab",
              "dr.",
              "doctor",
              "health",
              "clinic",
              "hospital",
              "report",
              "test",
              "result",
              "analysis",
              "specimen",
              "sample",
            ];

            const hasExcludedTerm = excludeTerms.some((term) =>
              extractedName.toLowerCase().includes(term)
            );

            if (
              !hasExcludedTerm &&
              extractedName.length > 2 &&
              extractedName.length < 50 &&
              !/^\d+$/.test(extractedName) && // Not just numbers
              !/^[A-Z]{2,}$/.test(extractedName)
            ) {
              // Not just uppercase abbreviations

              potentialNames.push({
                name: extractedName.toUpperCase(),
                context,
                confidence,
              });
              console.log(
                "Extracted potential name:",
                extractedName,
                "context:",
                context,
                "confidence:",
                confidence
              );
            }
          }
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueNames = potentialNames
      .filter(
        (item, index, arr) =>
          arr.findIndex((other) => other.name === item.name) === index
      )
      .sort((a, b) => b.confidence - a.confidence);

    console.log("Potential patient names found:", uniqueNames);

    // Match against available patients with improved logic
    for (const candidate of uniqueNames) {
      for (const patient of patients) {
        const patientNameUpper = patient.name.toUpperCase();
        const candidateName = candidate.name;

        // Exact match - highest priority
        if (candidateName === patientNameUpper) {
          console.log(
            `Found exact match: ${patient.name} (ID: ${patient.id}) - confidence: ${candidate.confidence}`
          );
          return patient;
        }

        // Full name match within candidate (patient name appears in extracted text)
        if (
          candidateName.includes(patientNameUpper) &&
          candidate.confidence > 0.7
        ) {
          console.log(
            `Found full name within candidate: ${patient.name} (ID: ${patient.id}) - confidence: ${candidate.confidence}`
          );
          return patient;
        }
      }
    }

    // Secondary pass: look for complete patient names in high-confidence contexts only
    for (const patient of patients) {
      const nameUpper = patient.name.toUpperCase();
      const nameParts = nameUpper.split(" ");

      // Only proceed if we have a multi-part name (first + last name)
      if (nameParts.length >= 2) {
        for (const candidate of uniqueNames) {
          if (candidate.confidence > 0.8) {
            // Check if ALL parts of the patient name appear in the candidate
            const allPartsMatch = nameParts.every(
              (part) => part.length > 1 && candidate.name.includes(part)
            );

            if (allPartsMatch) {
              console.log(
                `Found all name parts match: ${patient.name} (ID: ${patient.id}) - confidence: ${candidate.confidence}`
              );
              return patient;
            }
          }
        }
      }
    }

    // Final fallback: exact patient name appearing anywhere in text (with strict context validation)
    for (const patient of patients) {
      const nameUpper = patient.name.toUpperCase();

      // Find all occurrences of the patient name in text
      const nameRegex = new RegExp(
        `\\b${nameUpper.replace(/\s+/g, "\\s+")}\\b`,
        "gi"
      );
      const matches = Array.from(text.matchAll(nameRegex));

      if (matches.length > 0) {
        // Check context around each match to ensure it's referring to a patient
        for (const match of matches) {
          const matchIndex = match.index || 0;
          const contextBefore = text
            .substring(Math.max(0, matchIndex - 50), matchIndex)
            .toLowerCase();
          const contextAfter = text
            .substring(
              matchIndex,
              Math.min(text.length, matchIndex + nameUpper.length + 50)
            )
            .toLowerCase();

          // Skip if context suggests this is a doctor/staff name
          const doctorContext = [
            "dr.",
            "doctor",
            "physician",
            "authorized",
            "signed",
            "attending",
            "consultant",
          ];
          const isDoctorContext = doctorContext.some(
            (term) =>
              contextBefore.includes(term) || contextAfter.includes(term)
          );

          if (!isDoctorContext) {
            console.log(
              `Found patient name in valid context: ${patient.name} (ID: ${patient.id})`
            );
            return patient;
          } else {
            console.log(
              `Skipping patient name in doctor context: ${patient.name}`
            );
          }
        }
      }
    }

    console.log("No patient match found");
    return undefined;
  };

  // Optimized floating window drag handlers for real-time movement
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("resize-handle")) return;

    setIsDragging(true);
    isDraggingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    e.preventDefault();
  };

  // Optimized resize handlers
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    isResizingRef.current = true;
    setResizeDirection(direction);
    setDragOffset({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Real-time position update using transform for better performance
  const updateFloatingWindowPosition = (x: number, y: number) => {
    if (floatingWindowRef.current) {
      // Use transform for hardware acceleration and smoother movement
      floatingWindowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    currentPosRef.current = { x, y };
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizingRef.current) return;

    const deltaX = e.clientX - dragOffset.x;
    const deltaY = e.clientY - dragOffset.y;

    setWindowSize((prev) => {
      let newWidth = prev.width;
      let newHeight = prev.height;
      let newPosX = currentPosRef.current.x;
      let newPosY = currentPosRef.current.y;

      if (resizeDirection.includes("right")) {
        newWidth = Math.max(200, prev.width + deltaX);
      }
      if (resizeDirection.includes("left")) {
        newWidth = Math.max(200, prev.width - deltaX);
        newPosX = currentPosRef.current.x + deltaX;
      }
      if (resizeDirection.includes("bottom")) {
        newHeight = Math.max(150, prev.height + deltaY);
      }
      if (resizeDirection.includes("top")) {
        newHeight = Math.max(150, prev.height - deltaY);
        newPosY = currentPosRef.current.y + deltaY;
      }

      // Update position immediately for smooth resize
      updateFloatingWindowPosition(newPosX, newPosY);

      return { width: newWidth, height: newHeight };
    });

    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  // Zoom handlers
  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoomLevel + 0.25);
    setZoomLevel(newZoom);
    // Auto-hide document when zoomed for better visibility
    if (newZoom > 1.5) {
      setIsDocumentVisible(false);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.25, zoomLevel - 0.25);
    setZoomLevel(newZoom);
    // Auto-show document when zoom is reasonable
    if (newZoom <= 1.5) {
      setIsDocumentVisible(true);
    }
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setIsDocumentVisible(true);
  };

  const toggleDocumentVisibility = () => {
    setIsDocumentVisible(!isDocumentVisible);
  };

  // Optimized event listeners for smooth real-time movement
  React.useEffect(() => {
    let rafId: number | null = null;

    const handleMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        // Cancel previous frame if still pending
        if (rafId) {
          cancelAnimationFrame(rafId);
        }

        // Use requestAnimationFrame for smooth 60fps updates
        rafId = requestAnimationFrame(() => {
          const newPos = {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
          };

          // Apply boundary constraints in real-time
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const constrainedPos = {
            x: Math.max(0, Math.min(newPos.x, screenWidth - windowSize.width)),
            y: Math.max(
              0,
              Math.min(newPos.y, screenHeight - windowSize.height)
            ),
          };

          // Update position immediately via DOM for instant feedback
          updateFloatingWindowPosition(constrainedPos.x, constrainedPos.y);
          rafId = null;
        });
      }

      if (isResizingRef.current) {
        handleResize(e);
      }
    };

    const handleUp = () => {
      if (isDraggingRef.current) {
        // Cancel any pending animation frame
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        // Sync final position with React state
        setFloatingWindowPos({ ...currentPosRef.current });
      }

      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection("");
      isDraggingRef.current = false;
      isResizingRef.current = false;

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMove, { passive: true });
      document.addEventListener("mouseup", handleUp);
      if (isDragging) {
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    isDragging,
    isResizing,
    dragOffset.x,
    dragOffset.y,
    windowSize.width,
    windowSize.height,
  ]);

  // Handle window resize for textarea height adjustment
  React.useEffect(() => {
    const handleWindowResize = () => {
      const lineCount = editableText.split("\n").length;
      const calculatedHeight = Math.max(400, lineCount * 22 + 40);
      setTextareaHeight(calculatedHeight); // Precise fit to content
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [editableText]);

  // Sync initial position with refs using transform
  React.useEffect(() => {
    currentPosRef.current = floatingWindowPos;
    if (floatingWindowRef.current) {
      floatingWindowRef.current.style.transform = `translate3d(${floatingWindowPos.x}px, ${floatingWindowPos.y}px, 0)`;
    }
  }, [floatingWindowPos.x, floatingWindowPos.y]);

  useEffect(() => {
    // Check if we have the required data
    if (!state?.originalFile || !state?.extractedText) {
      toast({
        title: "Missing Data",
        description: "No document data found. Redirecting back to Lab Results.",
        variant: "destructive",
      });
      navigate("/lab-results");
      return;
    }

    // Set the editable text with OCR cleaning
    const cleanedText = cleanOcrText(state.extractedText);
    setEditableText(cleanedText);

    // Initialize textarea height to fit content precisely
    const initialLineCount = cleanedText.split("\n").length;
    const initialHeight = Math.max(400, initialLineCount * 22 + 40); // Precise fit
    setTextareaHeight(initialHeight); // No excessive space

    // Auto-detect patient and doctor from extracted text with enhanced matching
    const detectedPatient = detectPatientName(state.extractedText);
    const detectedDoctor = detectDoctorName(state.extractedText);

    if (detectedPatient) {
      setDetectedPatientName(detectedPatient);
      // Enhanced patient matching logic from LabResults.tsx
      const matchingPatient = findPatientFromText(
        state.extractedText,
        detectedPatient
      );
      if (matchingPatient) {
        setSelectedPatientId(matchingPatient.id.toString());
        setSelectedPatient(matchingPatient);
        setAutoDetectionResults((prev) => ({ ...prev, patient: true }));
        console.log(
          "Auto-selected patient:",
          matchingPatient.name,
          "ID:",
          matchingPatient.id
        );
      }
    }

    if (detectedDoctor) {
      setDetectedDoctorName(detectedDoctor);
      setAuthorizedBy(detectedDoctor);
      setAutoDetectionResults((prev) => ({ ...prev, doctor: true }));
      console.log("Auto-extracted doctor:", detectedDoctor);
    }

    // Test type auto-detection removed - using generic "Lab Result"

    // Pre-fill patient if provided in state
    if (state.patientId && !detectedPatient) {
      setSelectedPatientId(state.patientId);
      const patient = patients.find((p) => p.id === state.patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }

    // Create object URL for the uploaded image
    // Check if file is TIFF format
    const fileType = state.originalFile.type;
    const fileName = state.originalFile.name.toLowerCase();
    const isTiff =
      fileType === "image/tiff" ||
      fileType === "image/tif" ||
      fileName.endsWith(".tiff") ||
      fileName.endsWith(".tif");

    if (isTiff) {
      // For TIFF files, use a placeholder or text indicator since browsers don't support TIFF natively
      setOriginalImageUrl(""); // Empty URL will trigger fallback display
    } else {
      const imageUrl = URL.createObjectURL(state.originalFile);
      setOriginalImageUrl(imageUrl);
    }

    // Cleanup function to revoke object URL
    return () => {
      if (!isTiff && originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
      }
    };
  }, [state, navigate, patients]);

  const handleTextChange = (newText: string) => {
    setEditableText(newText);
    setHasChanges(newText !== state.extractedText);

    // Calculate precise height to fit content exactly
    const lineCount = newText.split("\n").length;
    const calculatedHeight = Math.max(400, lineCount * 22 + 40); // 22px per line + small padding
    setTextareaHeight(calculatedHeight); // Precise fit without excess space

    // Re-run auto-detection on text changes with enhanced matching
    const detectedPatient = detectPatientName(newText);
    const detectedDoctor = detectDoctorName(newText);

    if (detectedPatient && detectedPatient !== detectedPatientName) {
      setDetectedPatientName(detectedPatient);
      const matchingPatient = findPatientFromText(newText, detectedPatient);
      if (matchingPatient) {
        setSelectedPatientId(matchingPatient.id.toString());
        setSelectedPatient(matchingPatient);
        setAutoDetectionResults((prev) => ({ ...prev, patient: true }));
        console.log(
          "Re-detected patient:",
          matchingPatient.name,
          "ID:",
          matchingPatient.id
        );
      }
    }

    if (detectedDoctor && detectedDoctor !== detectedDoctorName) {
      setDetectedDoctorName(detectedDoctor);
      setAuthorizedBy(detectedDoctor);
      setAutoDetectionResults((prev) => ({ ...prev, doctor: true }));
      console.log("Re-detected doctor:", detectedDoctor);
    }
  };

  const handleCleanText = () => {
    const cleanedText = cleanOcrText(editableText);
    setEditableText(cleanedText);
    setHasChanges(cleanedText !== state.extractedText);

    // Adjust container to fit cleaned content precisely
    const lineCount = cleanedText.split("\n").length;
    const calculatedHeight = Math.max(400, lineCount * 22 + 40);
    setTextareaHeight(calculatedHeight); // Precise fit without excess space

    toast({
      title: "Text Cleaned",
      description:
        "OCR text has been cleaned - excessive blank lines removed and formatting preserved.",
    });
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = patients.find((p) => p.id === patientId);
    setSelectedPatient(patient);
  };

  const handleResetText = () => {
    const cleanedText = cleanOcrText(state.extractedText);
    setEditableText(cleanedText);
    setHasChanges(false);

    // Adjust container to fit reset content precisely
    const lineCount = cleanedText.split("\n").length;
    const calculatedHeight = Math.max(400, lineCount * 22 + 40);
    setTextareaHeight(calculatedHeight); // Precise fit without excess space

    toast({
      title: "Text Reset",
      description:
        "Extracted text has been reset to original with OCR cleaning applied.",
    });
  };

  // Generate HTML-based professional PDF using the same format as downloadCorrectedText
  const generateProfessionalHTMLPDF = (): string => {
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>Lab Result Report - ${selectedPatient?.name || "Patient"}</title>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 0.4in 0.5in;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Arial', 'Helvetica', sans-serif; 
          font-size: 9pt;
          line-height: 1.25;
          background-color: #ffffff;
          color: #000000;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.4in 0.5in;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #2c5282;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        
        .title {
          font-size: 14pt;
          font-weight: bold;
          color: #2c5282;
          margin-bottom: 3px;
          letter-spacing: 0.5px;
        }
        
        .date {
          font-size: 8pt;
          color: #495057;
        }
        
        .info-section {
          border: 1px solid #cbd5e0;
          padding: 6px 8px;
          margin-bottom: 10px;
          background: #f8f9fa;
          border-radius: 3px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 8.5pt;
        }
        
        .info-item {
          margin: 2px 0;
        }
        
        .label {
          font-weight: bold;
          color: #2c5282;
          display: inline-block;
          min-width: 85px;
        }
        
        .results-header {
          font-size: 10pt;
          font-weight: bold;
          color: #2c5282;
          margin: 8px 0 6px 0;
          border-bottom: 1.5px solid #cbd5e0;
          padding-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .content {
          white-space: pre-wrap;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 7.5pt;
          line-height: 1.2;
          border: 1px solid #e2e8f0;
          padding: 8px;
          background: #ffffff;
          word-break: break-word;
          overflow-wrap: break-word;
          max-height: 6.5in;
          overflow: hidden;
        }
        
        .footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 7pt;
          color: #6c757d;
        }
        
        .confidential {
          margin-top: 6px;
          padding: 4px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 2px;
          font-size: 6.5pt;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">LABORATORY RESULT REPORT</h1>
        <p class="date">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      
      <div class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Patient:</span> ${
              selectedPatient?.name || "Not selected"
            }
          </div>
          <div class="info-item">
            <span class="label">Date:</span> ${new Date().toLocaleDateString()}
          </div>
          <div class="info-item">
            <span class="label">Authorized By:</span> ${
              authorizedBy || "Not specified"
            }
          </div>
          <div class="info-item">
            <span class="label">Report ID:</span> LAB-${Date.now()
              .toString()
              .slice(-8)}
          </div>
        </div>
      </div>
      
      <h3 class="results-header">Test Results</h3>
      <div class="content">${editableText}</div>
      
      <div class="footer">
        <div>This is a computer-generated document.</div>
        <div class="confidential">
          <strong>⚠️ CONFIDENTIAL MEDICAL RECORD</strong> - This document contains private health information protected by law.
        </div>
      </div>
    </body>
    </html>`;
  };

  // Function to generate actual PDF file
  const generatePDFFile = async (): Promise<Blob> => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 0.5;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 0.3;

    // Helper function to get proper logo URL
    const getFullLogoUrl = (logo: string) => {
      if (!logo) return null;
      if (logo.startsWith("http")) return logo;
      const baseUrl = ENV.API_URL.replace("/api", "");
      if (logo.startsWith("/media/")) return `${baseUrl}${logo}`;
      if (logo.startsWith("branding/")) return `${baseUrl}/media/${logo}`;
      if (!logo.includes("/")) return `${baseUrl}/media/branding/${logo}`;
      return `${baseUrl}${logo.startsWith("/") ? logo : "/" + logo}`;
    };

    // Add logo at the top if clinic settings has logo
    if (clinicSettings?.logo) {
      try {
        const logoUrl = getFullLogoUrl(clinicSettings.logo);
        if (logoUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = logoUrl;

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          // Compress logo by rendering to canvas at smaller size
          const canvas = document.createElement("canvas");
          const targetSize = 200; // Increased size in pixels for better quality
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.drawImage(img, 0, 0, targetSize, targetSize);
            const compressedLogo = canvas.toDataURL("image/jpeg", 0.7); // JPEG with 70% quality

            const logoWidth = 1.5; // 1.5 inches width in PDF
            const logoHeight = 0.6; // 0.6 inches height in PDF
            doc.addImage(
              compressedLogo,
              "JPEG",
              pageWidth / 2 - logoWidth / 2,
              yPos,
              logoWidth,
              logoHeight
            );
            yPos += logoHeight + 0.08;
          }
        }
      } catch (error) {
        console.error("Error loading clinic logo:", error);
        // Continue without logo if there's an error
      }
    }

    // Clinic name
    if (clinicSettings?.name) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 26, 26);
      doc.text(clinicSettings.name, pageWidth / 2, yPos, { align: "center" });
      yPos += 0.16;
    }

    // Clinic address
    if (clinicSettings?.address) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85, 85, 85);
      doc.text(clinicSettings.address, pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 0.14;
    }

    // Clinic contact (phone | email)
    const contactParts = [];
    if (clinicSettings?.phone) contactParts.push(clinicSettings.phone);
    if (clinicSettings?.email) contactParts.push(clinicSettings.email);

    if (contactParts.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85, 85, 85);
      doc.text(contactParts.join(" | "), pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 0.15;
    }

    // Professional border separator
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.02);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 0.15;

    // Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 82, 130);
    doc.text("LABORATORY RESULT REPORT", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 0.2;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(73, 80, 87);
    const dateTime = `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    doc.text(dateTime, pageWidth / 2, yPos, { align: "center" });
    yPos += 0.15;

    // Header line
    doc.setDrawColor(44, 82, 130);
    doc.setLineWidth(0.02);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 0.15;

    // Info section background
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(203, 213, 224);
    doc.roundedRect(margin, yPos, contentWidth, 0.6, 0.05, 0.05, "FD");

    // Info grid
    doc.setFontSize(8.5);
    const infoYStart = yPos + 0.12;

    // Row 1
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 82, 130);
    doc.text("Patient:", margin + 0.1, infoYStart);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(selectedPatient?.name || "Not selected", margin + 0.8, infoYStart);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 82, 130);
    doc.text("Date:", margin + contentWidth / 2 + 0.1, infoYStart);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(
      new Date().toLocaleDateString(),
      margin + contentWidth / 2 + 0.5,
      infoYStart
    );

    // Row 2
    const infoY2 = infoYStart + 0.2;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 82, 130);
    doc.text("Authorized By:", margin + 0.1, infoY2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(authorizedBy || "Not specified", margin + 1.1, infoY2);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 82, 130);
    doc.text("Report ID:", margin + contentWidth / 2 + 0.1, infoY2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(
      `LAB-${Date.now().toString().slice(-8)}`,
      margin + contentWidth / 2 + 0.75,
      infoY2
    );

    yPos += 0.75;

    // Results header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 82, 130);
    doc.text("TEST RESULTS", margin, yPos);
    yPos += 0.05;
    doc.setDrawColor(203, 213, 224);
    doc.setLineWidth(0.015);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 0.15;

    // Content area
    const contentBoxHeight = pageHeight - yPos - margin - 0.4; // Leave space for footer
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, yPos, contentWidth, contentBoxHeight, "FD");

    // Text content
    doc.setFontSize(7.5);
    doc.setFont("courier", "normal");
    doc.setTextColor(0, 0, 0);

    const lines = doc.splitTextToSize(editableText, contentWidth - 0.2);
    const maxLines = Math.floor(contentBoxHeight / 0.12);
    const displayLines = lines.slice(0, maxLines);

    let textY = yPos + 0.12;
    displayLines.forEach((line: string) => {
      doc.text(line, margin + 0.1, textY);
      textY += 0.12;
    });

    // Footer
    const footerY = pageHeight - margin - 0.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.01);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(108, 117, 125);
    doc.text(
      "This is a computer-generated document.",
      pageWidth / 2,
      footerY + 0.15,
      { align: "center" }
    );

    // Confidential notice box
    const boxY = footerY + 0.22;
    const boxHeight = 0.2;
    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(255, 193, 7);
    doc.setLineWidth(0.005);
    doc.roundedRect(margin, boxY, contentWidth, boxHeight, 0.02, 0.02, "FD");

    doc.setFontSize(7);
    doc.setTextColor(133, 100, 4);
    doc.setFont("helvetica", "bold");
    doc.text("CONFIDENTIAL MEDICAL RECORD", pageWidth / 2, boxY + 0.08, {
      align: "center",
    });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This document contains private health information protected by law.",
      pageWidth / 2,
      boxY + 0.15,
      { align: "center" }
    );

    return doc.output("blob");
  };

  // Simplified save function - no modal, direct save
  const handleSaveLabResult = async () => {
    // Validation
    if (!selectedPatientId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      console.log("=== LAB RESULT SAVE DEBUG START ===");
      console.log("Generating PDF and saving lab result...");
      console.log("Selected patient ID:", selectedPatientId);
      console.log("Selected patient object:", selectedPatient);
      console.log("Authorized by:", authorizedBy);

      // Generate the actual PDF file
      const pdfBlob = await generatePDFFile();
      const pdfFileName = `lab_result_${
        selectedPatient?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "patient"
      }_${new Date().toISOString().split("T")[0]}.pdf`;
      const pdfFile = new File([pdfBlob], pdfFileName, {
        type: "application/pdf",
      });

      console.log("PDF file created:", pdfFileName);
      console.log("PDF size:", pdfBlob.size, "bytes");
      console.log("Editable text length:", editableText?.length);
      console.log(
        "Original file:",
        state.originalFile?.name,
        state.originalFile?.size,
        "bytes"
      );

      // Use the exact same FormData structure as before
      const formData = new FormData();
      formData.append("patient", selectedPatientId);
      formData.append("title", "Lab Result");
      formData.append("description", "Lab test results processed via OCR");
      formData.append("content", editableText);
      formData.append("document_date", new Date().toISOString().split("T")[0]);
      formData.append("status", "completed");
      formData.append("urgency", "normal");

      // Lab result specific fields
      formData.append("test_name", "Lab Test");
      formData.append("specimen_type", "blood");
      formData.append("laboratory_name", "Health Nexus Lab");
      formData.append("lab_reference_number", `LAB-${Date.now()}`);
      formData.append(
        "collection_date",
        new Date().toISOString().split("T")[0]
      );
      formData.append("received_date", new Date().toISOString().split("T")[0]);
      formData.append("reported_date", new Date().toISOString().split("T")[0]);
      formData.append("test_results", JSON.stringify([]));
      formData.append(
        "interpretation",
        "Automated extraction from Google Colab algorithms"
      );
      formData.append(
        "processing_notes",
        "Processed via Google Colab algorithms with AWS Textract OCR system"
      );

      if (authorizedBy && authorizedBy.trim()) {
        formData.append("authorized_by", authorizedBy.trim());
      }

      // Include the original file AND the generated HTML file as processed_file
      formData.append("document", state.originalFile);
      formData.append("processed_file", pdfFile);

      console.log("Making request to save lab result...");

      const response = await fetch(
        `${ENV.API_URL}/medical-documents/lab-results/`,
        {
          method: "POST",
          body: formData,
          credentials: "include", // Include session cookies
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          errorData || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const savedLabResult = await response.json();
      console.log("Lab result saved successfully:", savedLabResult);
      console.log("=== LAB RESULT SAVE DEBUG END ===");

      toast({
        title: "Success",
        description: `Professional lab result saved to ${selectedPatient?.name}'s medical record!`,
      });

      // Navigate back to lab results
      navigate("/lab-results", {
        state: {
          savedLabResult: savedLabResult,
          message: "Professional lab result saved successfully",
          autoDetected: autoDetectionResults,
        },
      });
    } catch (error) {
      console.error("Error saving lab result:", error);
      toast({
        title: "Save Error",
        description: `Failed to save lab result: ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // View function - opens the same HTML format in new window
  const handleViewLabResult = () => {
    // Validation
    if (!selectedPatientId) {
      toast({
        title: "Missing Information",
        description: "Please select a patient before viewing the lab result.",
        variant: "destructive",
      });
      return;
    }

    // Generate and open the HTML content
    const htmlContent = generateProfessionalHTMLPDF();
    const viewWindow = window.open(
      "",
      "_blank",
      "width=1000,height=1200,scrollbars=yes,resizable=yes"
    );

    if (viewWindow) {
      viewWindow.document.write(htmlContent);
      viewWindow.document.close();

      toast({
        title: "Lab Result Opened",
        description: "Professional PDF lab result opened in new tab.",
      });
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to view the lab result.",
        variant: "destructive",
      });
    }
  };

  const handlePreview = () => {
    // Open a preview of the corrected text
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lab Result Preview</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 14px;
              color: #374151;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #1f2937; margin: 0;">Lab Result Preview</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="info-section">
              <h3>Patient Information</h3>
              <p><strong>Patient:</strong> ${
                selectedPatient?.name || "Not selected"
              }</p>
              <p><strong>Test Type:</strong> Lab Result</p>
             
              <p><strong>Authorized By:</strong> ${
                authorizedBy || "Not specified"
              }</p>
            
            </div>
            <div class="content">
              <h3>Test Results</h3>
              ${editableText}
            </div>
          </div>
        </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const downloadCorrectedText = () => {
    const content = `${editableText}`;

    // Open in a PDF-sized viewing window that maintains the content
    const viewWindow = window.open(
      "",
      "_blank",
      "width=1000,height=1200,scrollbars=yes,resizable=yes"
    );
    if (viewWindow) {
      viewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lab Result Report - ${
            selectedPatient?.name || "Patient"
          }</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Professional medical document styling matching prescription format */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12pt;
              line-height: 1.6;
              background-color: #ffffff;
              color: #333333;
              width: 8.5in;
              min-height: 11in;
              margin: 0 auto;
              padding: 0.5in;
              position: relative;
            }
            
            .page {
              width: 100%;
              min-height: 10in;
              background: white;
              padding: 0.3in;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #059669;
            }
            
            .clinic-name {
              font-size: 20pt;
              font-weight: bold;
              color: #059669;
              margin-bottom: 8px;
            }
            
            .clinic-info {
              font-size: 10pt;
              color: #666666;
              margin-bottom: 15px;
            }
            
            .title {
              font-size: 18pt;
              font-weight: bold;
              color: #059669;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .generation-date {
              font-size: 9pt;
              color: #888888;
              font-style: italic;
            }
            
            .patient-info {
              background: #f8fffe;
              border: 1px solid #d1fae5;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
            }
            
            .info-item {
              margin-bottom: 8px;
            }
            
            .label {
              font-weight: bold;
              color: #059669;
              display: block;
              margin-bottom: 2px;
              font-size: 11pt;
            }
            
            .value {
              color: #333333;
              font-size: 12pt;
            }
            
            .results-section {
              margin-top: 20px;
            }
            
            .results-header {
              font-size: 16pt;
              font-weight: bold;
              color: #059669;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #d1fae5;
              text-transform: uppercase;
            }
            
            .content {
              white-space: pre-wrap;
              font-family: Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #333333;
              background: #fafafa;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 20px;
              min-height: 300px;
            }
            
            .signature-section {
              margin-top: 40px;
              text-align: right;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            
            .signature-line {
              border-bottom: 1px solid #333;
              width: 200px;
              margin-left: auto;
              margin-bottom: 5px;
            }
            
            .doctor-info {
              font-size: 11pt;
              color: #059669;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 9pt;
              color: #888888;
              font-style: italic;
            }
            
            .download-actions {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(255,255,255,0.95);
              padding: 12px;
              border-radius: 6px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 1000;
            }
            
            .action-btn {
              display: block;
              width: 130px;
              margin: 4px 0;
              padding: 8px 12px;
              border: none;
              border-radius: 4px;
              font-size: 10pt;
              cursor: pointer;
              transition: all 0.2s;
              font-weight: 500;
            }
            
            .pdf-btn {
              background: #059669;
              color: white;
            }
            
            .pdf-btn:hover {
              background: #047857;
            }
            
            .download-btn {
              background: #059669;
              color: white;
            }
            
            .download-btn:hover {
              background: #047857;
            }
            
            .print-btn {
              background: #059669;
              color: white;
            }
            
            .print-btn:hover {
              background: #047857;
            }
            
            .copy-btn {
              background: #059669;
              color: white;
            }
            
            .copy-btn:hover {
              background: #047857;
            }
            
            @media print {
              .download-actions { 
                display: none !important; 
              }
              
              body {
                margin: 0;
                padding: 0;
              }
              
              .page {
                box-shadow: none;
                margin: 0;
                padding: 0.5in;
              }
            }
            
            .content {
              white-space: pre-wrap;
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.4;
              border: 1px solid #ddd;
              padding: 10px;
              background: #fdfdfd;
              word-break: break-word;
              overflow-wrap: break-word;
              flex: 1;
              overflow-y: auto;
              max-height: 9in;
            }
            
            .download-actions {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(255,255,255,0.95);
              padding: 12px;
              border-radius: 6px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 1000;
            }
            
            .action-btn {
              display: block;
              width: 130px;
              margin: 4px 0;
              padding: 8px 12px;
              border: none;
              border-radius: 4px;
              font-size: 10pt;
              cursor: pointer;
              transition: all 0.2s;
            }
            
            .pdf-btn {
              background: #dc2626;
              color: white;
            }
            
            .pdf-btn:hover {
              background: #b91c1c;
            }
            
            .download-btn {
              background: #2563eb;
              color: white;
            }
            
            .download-btn:hover {
              background: #1d4ed8;
            }
            
            .print-btn {
              background: #059669;
              color: white;
            }
            
            .print-btn:hover {
              background: #047857;
            }
            
            .copy-btn {
              background: #7c3aed;
              color: white;
            }
            
            .copy-btn:hover {
              background: #6d28d9;
            }
            
            /* Print styles for single page PDF */
            @media print {
              body {
                width: 8.5in;
                height: 11in;
                margin: 0;
                padding: 0.4in;
                font-family: Arial, sans-serif;
                font-size: 12pt;
                overflow: hidden;
              }
              
              .download-actions { 
                display: none !important; 
              }
              
              .page {
                box-shadow: none;
                margin: 0;
                padding: 0.2in;
                height: 10.2in;
                min-height: 10.2in;
              }
              
              .header {
                padding-bottom: 5px;
                margin-bottom: 8px;
              }
              
              .title {
                font-size: 12pt;
              }
              
              .info-section {
                padding: 6px;
                margin-bottom: 8px;
              }
              
              .info-grid {
                font-size: 8pt;
              }
              
              .results-header {
                font-size: 10pt;
                margin: 5px 0 5px 0;
              }
              
              .content {
                border: 1px solid #000;
                font-family: Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.4;
                padding: 6px;
                overflow: hidden;
                flex: 1;
                max-height: none;
              }
            }
            
            /* Responsive for smaller screens */
            @media screen and (max-width: 1100px) {
              body {
                width: 95%;
                padding: 15px;
              }
              
              .info-grid {
                grid-template-columns: 1fr;
              }
              
              .download-actions {
                position: relative;
                margin-top: 15px;
                right: auto;
                top: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- Header Section -->
            <div class="header">
              <div class="clinic-name">MedSync Health Center</div>
              <div class="clinic-info">
                123 Medical Plaza, Healthcare District<br/>
                Phone: (555) 123-4567 | Email: info@medsync.com
              </div>
              <div class="title">Laboratory Result Report</div>
              <div class="generation-date">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            </div>
            
            <!-- Patient Information Section -->
            <div class="patient-info">
              <div class="info-item">
                <span class="label">Patient Name:</span>
                <span class="value">${
                  selectedPatient?.name || "Not selected"
                }</span>
              </div>
              <div class="info-item">
                <span class="label">Date of Birth:</span>
                <span class="value">${selectedPatient?.dob || "N/A"}</span>
              </div>
              <div class="info-item">
                <span class="label">Patient ID:</span>
                <span class="value">${selectedPatient?.id || "N/A"}</span>
              </div>
              <div class="info-item">
                <span class="label">Test Type:</span>
                <span class="value">Lab Result</span>
              </div>
              <div class="info-item">
                <span class="label">Report Date:</span>
                <span class="value">${new Date().toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <span class="label">Authorized By:</span>
                <span class="value">${authorizedBy || "Medical Officer"}</span>
              </div>
            </div>
            
            <!-- Test Results Section -->
            <div class="results-section">
              <h3 class="results-header">Test Results</h3>
              <div class="content">${editableText}</div>
            </div>
            
            <!-- Doctor Signature Section -->
            <div class="signature-section">
              <div class="signature-line"></div>
              <div class="doctor-info">
                Dr. ${authorizedBy || "Medical Officer"}<br/>
                Licensed Medical Practitioner<br/>
                MedSync Health Center
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              This is an electronically generated laboratory report. For verification, please contact our laboratory department.
            </div>
          </div>
          
          <div class="download-actions">
            <button class="action-btn pdf-btn" onclick="generatePDF()">Save PDF</button>
            <button class="action-btn download-btn" onclick="downloadAsFile()">Save TXT</button>
            <button class="action-btn print-btn" onclick="window.print()">Print</button>
            <button class="action-btn copy-btn" onclick="copyToClipboard()">Copy</button>
          </div>
          
          <script>
            function generatePDF() {
              window.print();
            }
            
            function downloadAsFile() {
              const content = \`Lab Result Report
Patient: ${selectedPatient?.name || "Not selected"}
Test Type: Lab Result
Authorized By: ${authorizedBy || "Not specified"}
Date: ${new Date().toLocaleDateString()}

Results:
${editableText}\`;
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'lab_result_${
                selectedPatient?.name?.replace(/[^a-zA-Z0-9]/g, "_") ||
                "patient"
              }_${new Date().toISOString().split("T")[0]}.txt';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            
            function copyToClipboard() {
              const content = \`Lab Result Report
Patient: ${selectedPatient?.name || "Not selected"}
Test Type: Lab Result
Authorized By: ${authorizedBy || "Not specified"}
Date: ${new Date().toLocaleDateString()}

Results:
${editableText}\`;
              navigator.clipboard.writeText(content).then(function() {
                alert('Report copied to clipboard successfully!');
              }).catch(function() {
                const textArea = document.createElement('textarea');
                textArea.value = content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Report copied to clipboard!');
              });
            }
            
            window.addEventListener('load', function() {
              if (window.outerWidth < 1000 || window.outerHeight < 1200) {
                window.resizeTo(1000, 1200);
              }
            });
          </script>
        </body>
        </html>
      `);
      viewWindow.document.close();

      toast({
        title: "Single-Page PDF View",
        description:
          "Lab result report opened in compressed single-page format.",
      });
    } else {
      // Fallback to direct download if popup is blocked
      const cleanContent = `Lab Result Report
Patient: ${selectedPatient?.name || "Not selected"}
Test Type: Lab Result
Authorized By: ${authorizedBy || "Not specified"}
Date: ${new Date().toLocaleDateString()}

Results:
${editableText}`;
      const blob = new Blob([cleanContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab_result_${selectedPatient?.name || "patient"}_${
        new Date().toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Lab result file has been downloaded.",
      });
    }
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">
            Preparing document comparison...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review & Complete Lab Result</h1>
            <p className="text-muted-foreground">
              Review extracted text, complete the form, and save the lab result
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedPatient && (
            <Badge variant="secondary">Patient: {selectedPatient.name}</Badge>
          )}
          {hasChanges && (
            <Badge
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-200"
            >
              Text Modified
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced Layout - Floating Document, Fullscreen Text */}
      <div className="relative">
        {/* Dynamically Sized Text Editor - Fits Content Precisely */}
        <Card
          className="border-gray-300 flex flex-col"
          style={{ height: `${textareaHeight + 120}px` }}
        >
          <CardHeader className="pb-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-base font-medium text-gray-800">
                  Extracted Text Editor - Full View
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded"
                  onClick={handleResetText}
                  disabled={!hasChanges}
                  title="Reset to original"
                >
                  Reset
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div
              className="flex-1 p-2"
              style={{ height: `${textareaHeight}px` }}
            >
              <textarea
                value={editableText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Extracted text will appear here for editing..."
                className="w-full h-full font-mono text-sm border border-gray-300 p-3 focus:border-gray-500 focus:outline-none resize-none bg-white leading-normal"
                style={{
                  height: `${textareaHeight}px`,
                  overflow: "hidden", // Remove scrolling completely
                  minHeight: `${textareaHeight}px`,
                  maxHeight: `${textareaHeight}px`,
                  wordWrap: "break-word", // Wrap long words
                  whiteSpace: "pre-wrap", // Preserve line breaks and wrap text
                  overflowWrap: "break-word", // Break long words that exceed container width
                }}
              />
            </div>
            <div className="flex-shrink-0 bg-gray-50 p-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span>{editableText.length} characters</span>
                  <span>{editableText.split("\n").length} lines</span>
                  <span
                    className={
                      hasChanges
                        ? "text-orange-600 font-medium"
                        : "text-green-600"
                    }
                  >
                    {hasChanges ? "Modified" : "Original"}
                  </span>
                  <span className="text-blue-600">
                    OCR Cleaned - No excessive blank lines
                  </span>
                </div>
                <span className="text-gray-400">
                  {state.originalFile.name} (
                  {(state.originalFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floating Original Document Window - Optimized for Real-time Movement */}
        {isDocumentVisible && (
          <div
            ref={floatingWindowRef}
            className="fixed z-50 bg-white border border-gray-300 shadow-lg transition-none"
            style={{
              left: "0px",
              top: "0px",
              width: `${windowSize.width}px`,
              height: `${windowSize.height}px`,
              cursor: isDragging ? "grabbing" : "default",
              willChange: "transform", // Optimize for animations
              transform: `translate3d(${floatingWindowPos.x}px, ${floatingWindowPos.y}px, 0)`, // Use transform for better performance
            }}
          >
            {/* Header - Minimal with Toggle */}
            <div
              className="bg-gray-100 border-b border-gray-300 p-2 cursor-move select-none"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Original Document
                </span>
                <div className="flex items-center gap-1">
                  {/* Zoom Controls */}
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded flex items-center"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs text-gray-600 px-1 min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded flex items-center"
                    onClick={handleZoomIn}
                    title="Zoom In"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded ml-1 flex items-center"
                    onClick={handleZoomReset}
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded ml-1 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(originalImageUrl, "_blank");
                    }}
                    title="Open in new tab"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFloatingWindowPos({ x: 16, y: 16 });
                      setWindowSize({ width: 384, height: 500 });
                      setZoomLevel(1);
                    }}
                    title="Reset position & size"
                  >
                    <Home className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-red-100 text-red-600 rounded ml-1 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDocumentVisibility();
                    }}
                    title="Hide document"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div
              className="overflow-auto bg-white"
              style={{ height: `${windowSize.height - 40}px` }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  width: `${100 / zoomLevel}%`,
                  height: `${100 / zoomLevel}%`,
                }}
              >
                {originalImageUrl ? (
                  <img
                    src={originalImageUrl}
                    alt="Original Document"
                    className="w-full h-auto object-contain"
                    style={{
                      backgroundColor: "#ffffff",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                    onError={(e) => {
                      // Handle image load errors
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML =
                          '<div style="padding: 20px; text-align: center; color: #666;"><p style="font-size: 14px; font-weight: 500;">📄 TIFF Document</p><p style="font-size: 12px; margin-top: 10px;">Preview not available for TIFF files</p><p style="font-size: 11px; margin-top: 5px; color: #999;">The document has been processed successfully</p></div>';
                      }
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                    }}
                  >
                    <p style={{ fontSize: "14px", fontWeight: "500" }}>
                      📄 TIFF Document
                    </p>
                    <p style={{ fontSize: "12px", marginTop: "10px" }}>
                      Preview not available for TIFF files
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        marginTop: "5px",
                        color: "#999",
                      }}
                    >
                      The document has been processed successfully
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Resize Handles */}
            <div
              className="resize-handle absolute top-0 right-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => handleResizeStart(e, "top-right")}
              style={{ background: "transparent" }}
            />
            <div
              className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, "bottom-right")}
              style={{ background: "transparent" }}
            />
            <div
              className="resize-handle absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => handleResizeStart(e, "bottom-left")}
              style={{ background: "transparent" }}
            />
            <div
              className="resize-handle absolute top-0 left-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => handleResizeStart(e, "top-left")}
              style={{ background: "transparent" }}
            />

            {/* Edge resize handles */}
            <div
              className="resize-handle absolute top-0 left-3 right-3 h-1 cursor-n-resize"
              onMouseDown={(e) => handleResizeStart(e, "top")}
              style={{ background: "transparent" }}
            />
            <div
              className="resize-handle absolute bottom-0 left-3 right-3 h-1 cursor-s-resize"
              onMouseDown={(e) => handleResizeStart(e, "bottom")}
              style={{ background: "transparent" }}
            />
            <div
              className="resize-handle absolute left-0 top-3 bottom-3 w-1 cursor-w-resize"
              onMouseDown={(e) => handleResizeStart(e, "left")}
              style={{ background: "transparent" }}
            />
            <div
              className="resize-handle absolute right-0 top-3 bottom-3 w-1 cursor-e-resize"
              onMouseDown={(e) => handleResizeStart(e, "right")}
              style={{ background: "transparent" }}
            />
          </div>
        )}

        {/* Show Document Button when hidden */}
        {!isDocumentVisible && (
          <button
            className="fixed top-4 right-4 z-50 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg shadow-lg hover:bg-gray-700 flex items-center gap-2"
            onClick={toggleDocumentVisibility}
            title="Show original document"
          >
            <Eye className="h-4 w-4" />
            Show Document
          </button>
        )}
      </div>

      {/* Lab Result Information Form - Moved to Bottom */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lab Result Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete the form to save the lab result
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient *
                {autoDetectionResults.patient && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </Label>
              <Popover
                open={patientSearchOpen}
                onOpenChange={setPatientSearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedPatientId
                      ? patients.find(
                          (patient) =>
                            patient.id.toString() === selectedPatientId
                        )?.name
                      : "Select a patient"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search patient..."
                      value={patientSearchTerm}
                      onValueChange={setPatientSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>No patient found.</CommandEmpty>
                      <CommandGroup>
                        {patients
                          .filter((patient) => {
                            // If there's a search term, filter by name
                            if (patientSearchTerm) {
                              return patient.name
                                .toLowerCase()
                                .includes(patientSearchTerm.toLowerCase());
                            }
                            // Otherwise show first 10 patients
                            return true;
                          })
                          .slice(0, patientSearchTerm ? undefined : 10)
                          .map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={patient.name}
                              onSelect={() => {
                                handlePatientSelect(patient.id.toString());
                                setPatientSearchOpen(false);
                                setPatientSearchTerm("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPatientId === patient.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {patient.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {detectedPatientName && !autoDetectionResults.patient && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Detected "{detectedPatientName}" but no matching patient
                  found. Please select manually.
                </p>
              )}
            </div>

            {/* Authorized By */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Authorized By *
                {authorizedBy && autoDetectionResults.doctor && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                    Auto-extracted
                  </span>
                )}
              </Label>
              <Input
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                placeholder="Enter doctor name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>

        <Button
          variant="outline"
          onClick={handleViewLabResult}
          disabled={!selectedPatientId}
          className="min-w-[120px]"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>

        <Button
          onClick={handleSaveLabResult}
          disabled={isSaving || !selectedPatientId}
          className="min-w-[120px]"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Tips Section */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2 text-blue-900">
            🤖 Auto-Detection & Review Guidelines
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>Smart Detection:</strong> Patient and doctor names are
              automatically detected from extracted text
            </li>
            <li>
              • <strong>Text Review:</strong> Carefully check extracted text for
              OCR errors and medical accuracy
            </li>
            <li>
              • <strong>Auto-Mapping:</strong> Detected patients are
              automatically matched with existing records
            </li>
            <li>
              • <strong>Verification:</strong> Verify that auto-detected
              information is correct before saving
            </li>
            <li>
              • <strong>Manual Override:</strong> You can manually select
              different patient/doctor if auto-detection is incorrect
            </li>
            <li>
              • <strong>Data Completeness:</strong> Ensure all required fields
              (*) are completed before saving
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentComparison;
