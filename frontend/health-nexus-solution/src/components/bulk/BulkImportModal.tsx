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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useBranding } from "@/contexts/BrandingContext";
import axios from "axios";
// Import sessionManager to ensure global axios configuration is applied
import "@/utils/sessionManager";
import { Upload, UserPlus, Users } from "lucide-react";
import React, { useState } from "react";

interface BulkImportModalProps {
  type: "patients" | "staff";
  onUploadComplete?: () => void;
}

export default function BulkImportModal({
  type,
  onUploadComplete,
}: BulkImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const { toast } = useToast();
  const { colors } = useBranding();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      // For patient uploads, validate against existing patients first
      if (type === "patients") {
        // Parse the CSV/Excel file first to check for duplicates and process empty marital_status
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length > 1) {
          // Get existing patients from database
          const existingPatientsResponse = await axios.get("patients/");
          const existingPatients = existingPatientsResponse.data;

          // Parse CSV headers and data
          const headers = lines[0].split(",").map((h) =>
            h
              .trim()
              .toLowerCase()
              .replace(/\s*\(required\)\s*/i, ""),
          );
          const firstNameIndex = headers.indexOf("first_name");
          const lastNameIndex = headers.indexOf("last_name");
          const dobIndex = headers.indexOf("date_of_birth");
          const maritalStatusIndex = headers.indexOf("marital_status");

          // Date format validation regex (YYYY-MM-DD)
          const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

          // Map to track duplicate names within the CSV
          const nameMap = new Map<string, number>();

          // Process the CSV to set default marital_status
          const processedLines = [lines[0]]; // Keep header

          if (
            firstNameIndex !== -1 &&
            lastNameIndex !== -1 &&
            dobIndex !== -1
          ) {
            // Check each row for duplicates within CSV, validate date format, check database, and process marital_status
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i]
                .split(",")
                .map((v) => v.trim().replace(/^"|"$/g, ""));
              const firstName = values[firstNameIndex];
              const lastName = values[lastNameIndex];
              const dob = values[dobIndex];

              // Check for duplicate names within the CSV file
              if (firstName && lastName) {
                const fullName = `${firstName.toLowerCase().trim()} ${lastName.toLowerCase().trim()}`;

                if (nameMap.has(fullName)) {
                  const firstOccurrence = nameMap.get(fullName)! + 1;
                  toast({
                    title: "Duplicate Entry in CSV",
                    description: `Rows ${firstOccurrence} and ${i + 1}: Patient "${firstName} ${lastName}" appears multiple times in your CSV file.`,
                    variant: "destructive",
                  });
                  setIsUploading(false);
                  return;
                }
                nameMap.set(fullName, i);
              }

              // Validate date format
              if (dob && !dateFormatRegex.test(dob)) {
                toast({
                  title: "Invalid Date Format",
                  description: `Row ${i + 1}: Date of birth must be in YYYY-MM-DD format (e.g., 2026-01-31). Found: "${dob}"`,
                  variant: "destructive",
                });
                setIsUploading(false);
                return;
              }

              // Set marital_status to "prefer_not_to_say" if empty
              if (maritalStatusIndex !== -1 && !values[maritalStatusIndex]) {
                values[maritalStatusIndex] = "prefer_not_to_say";
              }

              // Check if patient already exists in database
              if (firstName && lastName && dob) {
                const existingPatient = existingPatients.find(
                  (patient: any) => {
                    if (
                      !patient.first_name ||
                      !patient.last_name ||
                      !patient.date_of_birth
                    ) {
                      return false;
                    }
                    return (
                      patient.first_name.toLowerCase() ===
                        firstName.toLowerCase() &&
                      patient.last_name.toLowerCase() ===
                        lastName.toLowerCase() &&
                      patient.date_of_birth === dob
                    );
                  },
                );

                if (existingPatient) {
                  toast({
                    title: "Patient Already Exists",
                    description: `Row ${i + 1}: A patient named "${firstName} ${lastName}" with the same date of birth (${dob}) already exists in the database (Patient ID: ${existingPatient.patient_id}).`,
                    variant: "destructive",
                  });
                  setIsUploading(false);
                  return;
                }
              }

              // Reconstruct the line with proper quoting
              const processedLine = values
                .map((v) => (v.includes(",") || v.includes('"') ? `"${v}"` : v))
                .join(",");
              processedLines.push(processedLine);
            }

            // Create a new file with processed data
            const processedCsv = processedLines.join("\n");
            const processedBlob = new Blob([processedCsv], {
              type: "text/csv",
            });
            const processedFile = new File([processedBlob], file.name, {
              type: file.type,
            });

            const formData = new FormData();
            formData.append("file", processedFile);

            const response = await axios.post(
              `bulk/${type}/upload/`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              },
            );

            const result = response.data;
            toast({
              title: "Upload Successful",
              description: `Successfully imported ${result.created_count} ${type}. ${
                result.errors?.length || 0
              } errors.`,
            });
            setIsOpen(false);
            setUploadFile(null);

            if (onUploadComplete) {
              onUploadComplete();
            }
            return;
          }
        }
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`bulk/${type}/upload/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = response.data;
      toast({
        title: "Upload Successful",
        description: `Successfully imported ${result.created_count} ${type}. ${
          result.errors?.length || 0
        } errors.`,
      });
      setIsOpen(false);
      setUploadFile(null);

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      console.log("Error response:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to upload file";
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
    const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format

    // Use clean headers without (required) for backend compatibility
    const headers =
      type === "patients"
        ? [
            "first_name",
            "last_name",
            "middle_initial",
            "suffix",
            "email",
            "phone",
            "date_of_birth",
            "sex",
            "address",
            "marital_status",
            "religion",
          ]
        : [
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "department",
            "license_number",
          ];

    const csvContent =
      headers.join(",") +
      "\n" +
      (type === "patients"
        ? `John,Doe,M,Jr,john.doe@email.com,09123456789,${currentDate},male,"123 Main St",single,Roman Catholic\nJane,Smith,,,jane.smith@email.com,09987654321,${currentDate},female,"456 Oak Ave",married,Christian\nAaron,Lowe,III,,aaron.lowe@email.com,09112233445,${currentDate},male,"789 Pine Rd",prefer_not_to_say,Islam`
        : "Jane,Smith,jane.smith@hospital.com,09123456789,doctor,cardiology,MD12345\nJohn,Doe,john.doe@hospital.com,09987654321,nurse,emergency,RN67890\nSarah,Johnson,sarah.johnson@hospital.com,09556677889,receptionist,,");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 active:scale-[0.97] transition-all duration-150"
        >
          <UserPlus className="h-4 w-4" />
          Bulk Add {type === "patients" ? "Patients" : "Staff"}
        </Button>
      </DialogTrigger>
      {/* ✅ Centered modal with fixed header */}
      <DialogContent className="w-full h-[75vh] sm:h-[600px] max-w-[85vw] sm:max-w-[900px] flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {type === "patients" ? (
              <Users className="h-5 w-5" />
            ) : (
              <UserPlus className="h-5 w-5" />
            )}
            Bulk Import {type === "patients" ? "Patients" : "Staff"}
          </DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue="upload"
          onValueChange={setActiveTab}
          className="w-full flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-shrink-0 bg-white pb-2 px-4 sm:px-8 border-b">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger
                value="upload"
                className="transition-colors text-xs sm:text-sm"
                style={{
                  backgroundColor:
                    activeTab === "upload" ? colors.primaryColor : undefined,
                  color: activeTab === "upload" ? "white" : undefined,
                }}
              >
                <span className="hidden sm:inline">File Upload</span>
                <span className="sm:hidden">Upload</span>
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="transition-colors text-xs sm:text-sm"
                style={{
                  backgroundColor:
                    activeTab === "manual" ? colors.primaryColor : undefined,
                  color: activeTab === "manual" ? "white" : undefined,
                }}
              >
                <span className="hidden sm:inline">Manual Entry</span>
                <span className="sm:hidden">Manual</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 overflow-y-auto pt-3 sm:pt-4 px-4 sm:px-6">
            <TabsContent
              value="upload"
              className="space-y-3 sm:space-y-4 flex-1 mt-0"
            >
              <Card className="h-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    Upload CSV/Excel File
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Upload a CSV or Excel file containing {type} data. Make sure
                    the file follows the required format.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
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
                        Selected: {uploadFile.name} (
                        {(uploadFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => uploadFile && handleFileUpload(uploadFile)}
                      disabled={!uploadFile || isUploading}
                      className="flex-1 hover:opacity-90 active:opacity-80 hover:scale-[0.99] active:scale-[0.97] transition-all duration-150 text-sm"
                    >
                      {isUploading ? "Uploading..." : "Upload & Import"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 active:scale-[0.97] transition-all duration-150 text-sm sm:whitespace-nowrap"
                    >
                      Download Template
                    </Button>
                  </div>

                  {/* Required Fields Info */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-900 font-medium mb-1">
                      📋 Required Fields for{" "}
                      {type === "patients" ? "Patients" : "Staff"}:
                    </p>
                    <p className="text-xs text-blue-800">
                      {type === "patients"
                        ? "first_name, last_name, email, phone, date_of_birth, sex, address, religion"
                        : "first_name, last_name, email, phone, role"}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      📅 <strong>Date Format:</strong> date_of_birth must be
                      YYYY-MM-DD (e.g., 2026-01-31)
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      💡 Empty marital_status will default to
                      "prefer_not_to_say"
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent
              value="manual"
              className="space-y-3 sm:space-y-4 flex-1 mt-0"
            >
              <Card className="h-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">
                    Manual Bulk Entry
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Enter multiple {type} records manually using a form
                    interface.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <ManualBulkEntry
                    type={type}
                    onComplete={() => {
                      setIsOpen(false);
                      if (onUploadComplete) {
                        onUploadComplete();
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ManualBulkEntry({
  type,
  onComplete,
}: {
  type: "patients" | "staff";
  onComplete: () => void;
}) {
  const [entries, setEntries] = useState([getEmptyEntry(type)]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  function getEmptyEntry(type: "patients" | "staff") {
    const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format

    return type === "patients"
      ? {
          first_name: "",
          last_name: "",
          middle_initial: "",
          suffix: "",
          email: "",
          phone: "",
          date_of_birth: currentDate,
          gender: "other",
          address: "",
          marital_status: "single",
          religion: "",
        }
      : {
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          role: "",
          department: "",
          license_number: "",
        };
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
    // Apply validations based on field type
    if (
      field === "first_name" ||
      field === "last_name" ||
      field === "middle_initial"
    ) {
      // Remove any numeric characters from name fields
      value = value.replace(/[0-9]/g, "");
    }

    if (field === "phone") {
      // Only allow digits for phone numbers
      value = value.replace(/\D/g, "");
      // Limit to 11 digits
      if (value.length > 11) {
        value = value.slice(0, 11);
      }
    }

    if (field === "middle_initial") {
      // Limit middle initial to 1 character
      value = value.slice(0, 1);
    }

    setEntries(
      entries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    fieldIndex: number,
    totalFields: number,
  ) => {
    if (e.key === "Tab" && !e.shiftKey) {
      // Moving forward
      if (fieldIndex === totalFields - 1) {
        // Last field in row, add new row if this is the last entry
        if (rowIndex === entries.length - 1) {
          e.preventDefault();
          addEntry();
          // Focus will automatically move to the next input
          setTimeout(() => {
            const nextInput = document.querySelector(
              `input[data-row="${rowIndex + 1}"][data-field="0"]`,
            ) as HTMLInputElement;
            nextInput?.focus();
          }, 50);
        }
      }
    }
  };

  const handleSubmit = async () => {
    // Validate all entries before submission
    const validTLDs = [
      "com",
      "net",
      "org",
      "edu",
      "gov",
      "mil",
      "co",
      "uk",
      "ph",
      "au",
      "ca",
      "de",
      "jp",
      "fr",
      "it",
      "es",
      "br",
      "in",
      "ru",
      "cn",
      "kr",
      "mx",
      "id",
      "tr",
      "nl",
      "be",
      "se",
      "no",
      "dk",
      "fi",
      "pl",
      "gr",
      "cz",
      "pt",
      "ro",
      "hu",
      "nz",
      "sg",
      "my",
      "th",
      "vn",
      "ua",
      "za",
      "ar",
      "cl",
      "co",
      "pe",
      "il",
      "ie",
      "at",
      "ch",
      "hk",
      "tw",
    ];

    const phoneRegex = /^09\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check for duplicate names within the entries being submitted
    const nameMap = new Map<string, number>();
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (type === "patients" && entry.first_name && entry.last_name) {
        const fullName = `${entry.first_name.toLowerCase().trim()} ${entry.last_name.toLowerCase().trim()}`;

        if (nameMap.has(fullName)) {
          const firstOccurrence = nameMap.get(fullName)! + 1;
          toast({
            title: "Duplicate Entry",
            description: `Rows ${firstOccurrence} and ${i + 1}: Patient "${entry.first_name} ${entry.last_name}" appears multiple times in your entries.`,
            variant: "destructive",
          });
          return;
        }
        nameMap.set(fullName, i);
      }
    }

    // Check if patients already exist in the database (only check for duplicate names)
    if (type === "patients") {
      try {
        const response = await axios.get("patients/");
        const existingPatients = response.data;

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const rowNum = i + 1;

          // Check for duplicate based on name and date of birth (emails and phone numbers can be shared)
          if (entry.first_name && entry.last_name && entry.date_of_birth) {
            const existingNameDatePatient = existingPatients.find(
              (patient: any) => {
                if (
                  !patient.first_name ||
                  !patient.last_name ||
                  !patient.date_of_birth
                ) {
                  return false;
                }

                return (
                  patient.first_name.toLowerCase() ===
                    entry.first_name.toLowerCase() &&
                  patient.last_name.toLowerCase() ===
                    entry.last_name.toLowerCase() &&
                  patient.date_of_birth === entry.date_of_birth
                );
              },
            );

            if (existingNameDatePatient) {
              toast({
                title: "Patient Already Exists",
                description: `Row ${rowNum}: A patient named "${entry.first_name} ${entry.last_name}" with the same date of birth (${entry.date_of_birth}) already exists in the database (Patient ID: ${existingNameDatePatient.patient_id}).`,
                variant: "destructive",
              });
              return;
            }
          }
        }
      } catch (error: any) {
        console.error("Error checking existing patients:", error);
        toast({
          title: "Validation Error",
          description:
            "Failed to check for existing patients. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const rowNum = i + 1;

      // Check required fields based on type
      if (type === "patients") {
        if (
          !entry.first_name ||
          !entry.last_name ||
          !entry.email ||
          !entry.phone ||
          !entry.date_of_birth ||
          !entry.gender ||
          !entry.religion ||
          !entry.address
        ) {
          toast({
            title: "Validation Error",
            description: `Row ${rowNum}: First Name, Last Name, Email, Phone, Date of Birth, Sex, Religion, and Address are required.`,
            variant: "destructive",
          });
          return;
        }

        // Validate email format
        if (!emailRegex.test(entry.email)) {
          toast({
            title: "Validation Error",
            description: `Row ${rowNum}: Invalid email format.`,
            variant: "destructive",
          });
          return;
        }

        // Validate email domain
        const emailParts = entry.email.toLowerCase().split("@");
        if (emailParts.length === 2) {
          const domain = emailParts[1];
          const tld = domain.split(".").pop();
          if (tld && !validTLDs.includes(tld)) {
            toast({
              title: "Validation Error",
              description: `Row ${rowNum}: Please enter a valid email domain (e.g., gmail.com, yahoo.com).`,
              variant: "destructive",
            });
            return;
          }
        }

        // Validate phone number (must be exactly 11 digits starting with 09)
        if (!phoneRegex.test(entry.phone)) {
          toast({
            title: "Validation Error",
            description: `Row ${rowNum}: Phone number must be exactly 11 digits and start with 09.`,
            variant: "destructive",
          });
          return;
        }

        // Validate date of birth
        if (entry.date_of_birth) {
          const dob = new Date(entry.date_of_birth);
          const today = new Date();
          if (dob > today) {
            toast({
              title: "Validation Error",
              description: `Row ${rowNum}: Date of birth cannot be in the future.`,
              variant: "destructive",
            });
            return;
          }
        }
      } else {
        // Staff validation
        if (
          !entry.first_name ||
          !entry.last_name ||
          !entry.email ||
          !entry.phone ||
          !entry.role
        ) {
          toast({
            title: "Validation Error",
            description: `Row ${rowNum}: First Name, Last Name, Email, Phone, and Role are required.`,
            variant: "destructive",
          });
          return;
        }

        // Validate email format
        if (!emailRegex.test(entry.email)) {
          toast({
            title: "Validation Error",
            description: `Row ${rowNum}: Invalid email format.`,
            variant: "destructive",
          });
          return;
        }

        // Validate email domain
        const emailParts = entry.email.toLowerCase().split("@");
        if (emailParts.length === 2) {
          const domain = emailParts[1];
          const tld = domain.split(".").pop();
          if (tld && !validTLDs.includes(tld)) {
            toast({
              title: "Validation Error",
              description: `Row ${rowNum}: Please enter a valid email domain.`,
              variant: "destructive",
            });
            return;
          }
        }

        // Validate phone number
        if (!phoneRegex.test(entry.phone)) {
          toast({
            title: "Validation Error",
            description: `Row ${rowNum}: Phone number must be exactly 11 digits and start with 09.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`bulk/${type}/upload/`, {
        data: entries,
      });

      const result = response.data;
      toast({
        title: "Bulk Entry Successful",
        description: `Successfully created ${result.created_count} ${type}.`,
      });
      onComplete();
    } catch (error: any) {
      console.error("Submit error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create entries";
      toast({
        title: "Bulk Entry Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientFields = [
    { key: "first_name", label: "First Name *", type: "text", required: true },
    { key: "last_name", label: "Last Name *", type: "text", required: true },
    { key: "middle_initial", label: "MI", type: "text", maxLength: 1 },
    { key: "suffix", label: "Suffix", type: "text" },
    { key: "email", label: "Email *", type: "email", required: true },
    {
      key: "phone",
      label: "Phone *",
      type: "tel",
      required: true,
      maxLength: 11,
    },
    {
      key: "date_of_birth",
      label: "Birth Date *",
      type: "date",
      required: true,
    },
    {
      key: "gender",
      label: "Sex *",
      type: "select",
      options: ["male", "female", "other"],
      required: true,
    },
    {
      key: "marital_status",
      label: "Marital Status",
      type: "select",
      options: [
        "single",
        "married",
        "divorced",
        "widowed",
        "prefer_not_to_say",
      ],
    },
    { key: "religion", label: "Religion *", type: "text", required: true },
    { key: "address", label: "Address *", type: "text", required: true },
  ];

  const staffFields = [
    { key: "first_name", label: "First Name *", type: "text", required: true },
    { key: "last_name", label: "Last Name *", type: "text", required: true },
    { key: "email", label: "Email *", type: "email", required: true },
    {
      key: "phone",
      label: "Phone *",
      type: "tel",
      required: true,
      maxLength: 11,
    },
    {
      key: "role",
      label: "Role *",
      type: "select",
      options: ["doctor", "receptionist", "admin"],
      required: true,
    },
    { key: "department", label: "Department", type: "text" },
    { key: "license_number", label: "License #", type: "text" },
  ];

  const fields = type === "patients" ? patientFields : staffFields;

  return (
    <div className="space-y-3">
      {/* Spreadsheet-like table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="sticky left-0 bg-gray-50 z-10 w-12 px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r">
                  #
                </th>
                {fields.map((field, idx) => (
                  <th
                    key={field.key}
                    className={`px-2 py-2 text-left text-xs font-semibold text-gray-600 border-r whitespace-nowrap min-w-[120px] ${
                      field.required ? "bg-blue-50" : ""
                    }`}
                  >
                    {field.label}
                  </th>
                ))}
                <th className="sticky right-0 bg-gray-50 z-10 w-16 px-2 py-2 text-center text-xs font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="sticky left-0 bg-white z-10 px-2 py-1 text-center text-xs text-gray-500 border-r font-medium">
                    {rowIndex + 1}
                  </td>
                  {fields.map((field, fieldIndex) => (
                    <td key={field.key} className="px-1 py-1 border-r">
                      {field.type === "select" ? (
                        <select
                          value={(entry as any)[field.key]}
                          onChange={(e) =>
                            updateEntry(rowIndex, field.key, e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(
                              e,
                              rowIndex,
                              fieldIndex,
                              fields.length,
                            )
                          }
                          data-row={rowIndex}
                          data-field={fieldIndex}
                          className={`w-full px-2 py-1.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded bg-transparent ${
                            field.required ? "bg-blue-50/30" : ""
                          }`}
                          required={field.required}
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={(entry as any)[field.key]}
                          onChange={(e) =>
                            updateEntry(rowIndex, field.key, e.target.value)
                          }
                          onKeyDown={(e) => {
                            // Prevent numbers in name fields
                            if (
                              (field.key === "first_name" ||
                                field.key === "last_name" ||
                                field.key === "middle_initial") &&
                              e.key >= "0" &&
                              e.key <= "9"
                            ) {
                              e.preventDefault();
                            }
                            handleKeyDown(
                              e,
                              rowIndex,
                              fieldIndex,
                              fields.length,
                            );
                          }}
                          maxLength={field.maxLength}
                          max={
                            field.type === "date"
                              ? new Date().toISOString().split("T")[0]
                              : undefined
                          }
                          data-row={rowIndex}
                          data-field={fieldIndex}
                          placeholder={field.label.replace(" *", "")}
                          className={`w-full px-2 py-1.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded bg-transparent ${
                            field.required ? "bg-blue-50/30" : ""
                          }`}
                          required={field.required}
                        />
                      )}
                    </td>
                  ))}
                  <td className="sticky right-0 bg-white z-10 px-2 py-1 text-center border-l">
                    <button
                      onClick={() => removeEntry(rowIndex)}
                      disabled={entries.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed text-xs px-2 py-1"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          variant="outline"
          onClick={addEntry}
          className="hover:bg-green-50 hover:text-green-700 hover:border-green-400 active:bg-green-100 active:scale-[0.97] transition-all duration-150 text-sm sm:whitespace-nowrap order-2 sm:order-1"
        >
          + Add Row
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 hover:opacity-90 active:opacity-80 hover:scale-[0.99] active:scale-[0.97] transition-all duration-150 text-sm order-1 sm:order-2"
        >
          {isSubmitting ? "Creating..." : `Create ${entries.length} ${type}`}
        </Button>
      </div>
    </div>
  );
}
