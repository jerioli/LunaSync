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
            "home_address",
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
        ? `John,Doe,M,Jr,john.doe@email.com,+1234567890,${currentDate},male,"123 Main St",single,Roman Catholic\nJane,Smith,,,jane.smith@email.com,+0987654321,${currentDate},female,"456 Oak Ave",married,Christian\nAaron,Lowe III,,,aaron.lowe@email.com,+1122334455,${currentDate},male,,single,Islam`
        : "Jane,Smith,jane.smith@hospital.com,+1234567890,doctor,cardiology,MD12345\nJohn,Doe,john.doe@hospital.com,+0987654321,nurse,emergency,RN67890\nSarah,Johnson,sarah.johnson@hospital.com,+5566778899,receptionist,,");

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
      <DialogContent className="w-full h-[90vh] sm:h-[600px] max-w-[95vw] sm:max-w-[900px] flex flex-col">
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

                  {/* Required Fields Section */}
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">
                      Required Fields:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700">
                      {type === "patients" ? (
                        <>
                          <div>• first_name (required)</div>
                          <div>• last_name (required)</div>
                          <div>• middle_initial (optional)</div>
                          <div>• suffix (optional)</div>
                          <div>• email (required, unique)</div>
                          <div>• phone (required)</div>
                          <div>• date_of_birth (YYYY-MM-DD)</div>
                          <div>• sex (male/female/other)</div>
                          <div>• home_address (optional)</div>
                          <div>• marital_status (optional)</div>
                          <div>• religion (optional)</div>
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
    setEntries(
      entries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleSubmit = async () => {
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

  return (
    <div className="space-y-3 sm:space-y-4">
      {entries.map((entry, index) => (
        <Card key={index} className="p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm sm:text-base">
              Entry {index + 1}
            </h4>
            {entries.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEntry(index)}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-400 active:bg-red-100 active:scale-[0.97] transition-all duration-150 text-xs sm:text-sm h-8"
              >
                Remove
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {type === "patients" ? (
              <>
                <div>
                  <Label className="text-xs sm:text-sm">First Name</Label>
                  <Input
                    value={entry.first_name}
                    onChange={(e) =>
                      updateEntry(index, "first_name", e.target.value)
                    }
                    placeholder="First name"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Last Name</Label>
                  <Input
                    value={entry.last_name}
                    onChange={(e) =>
                      updateEntry(index, "last_name", e.target.value)
                    }
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Middle Initial</Label>
                  <Input
                    value={entry.middle_initial}
                    onChange={(e) =>
                      updateEntry(index, "middle_initial", e.target.value)
                    }
                    placeholder="M"
                    maxLength={1}
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Suffix</Label>
                  <Input
                    value={entry.suffix}
                    onChange={(e) =>
                      updateEntry(index, "suffix", e.target.value)
                    }
                    placeholder="Jr, Sr, III"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input
                    value={entry.email}
                    onChange={(e) =>
                      updateEntry(index, "email", e.target.value)
                    }
                    placeholder="email@example.com"
                    type="email"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Phone</Label>
                  <Input
                    value={entry.phone}
                    onChange={(e) =>
                      updateEntry(index, "phone", e.target.value)
                    }
                    placeholder="+1234567890"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Date of Birth</Label>
                  <Input
                    value={entry.date_of_birth}
                    onChange={(e) =>
                      updateEntry(index, "date_of_birth", e.target.value)
                    }
                    type="date"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Sex</Label>
                  <Select
                    value={entry.gender}
                    onValueChange={(value) =>
                      updateEntry(index, "gender", value)
                    }
                  >
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Marital Status</Label>
                  <Select
                    value={entry.marital_status}
                    onValueChange={(value) =>
                      updateEntry(index, "marital_status", value)
                    }
                  >
                    <SelectTrigger className="text-sm h-9">
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
                <div>
                  <Label className="text-xs sm:text-sm">Religion</Label>
                  <Input
                    value={entry.religion}
                    onChange={(e) =>
                      updateEntry(index, "religion", e.target.value)
                    }
                    placeholder="Religion"
                    className="text-sm h-9"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs sm:text-sm">Home Address</Label>
                  <Textarea
                    value={entry.address}
                    onChange={(e) =>
                      updateEntry(index, "address", e.target.value)
                    }
                    placeholder="Full home address"
                    className="text-sm min-h-[72px]"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs sm:text-sm">First Name</Label>
                  <Input
                    value={entry.first_name}
                    onChange={(e) =>
                      updateEntry(index, "first_name", e.target.value)
                    }
                    placeholder="First name"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Last Name</Label>
                  <Input
                    value={entry.last_name}
                    onChange={(e) =>
                      updateEntry(index, "last_name", e.target.value)
                    }
                    placeholder="Last name"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input
                    value={entry.email}
                    onChange={(e) =>
                      updateEntry(index, "email", e.target.value)
                    }
                    placeholder="email@example.com"
                    type="email"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Phone</Label>
                  <Input
                    value={entry.phone}
                    onChange={(e) =>
                      updateEntry(index, "phone", e.target.value)
                    }
                    placeholder="+1234567890"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Role</Label>
                  <Select
                    value={entry.role}
                    onValueChange={(value) => updateEntry(index, "role", value)}
                  >
                    <SelectTrigger className="text-sm h-9">
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
                  <Label className="text-xs sm:text-sm">Department</Label>
                  <Input
                    value={entry.department}
                    onChange={(e) =>
                      updateEntry(index, "department", e.target.value)
                    }
                    placeholder="Department"
                    className="text-sm h-9"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs sm:text-sm">
                    License Number (for doctors)
                  </Label>
                  <Input
                    value={entry.license_number}
                    onChange={(e) =>
                      updateEntry(index, "license_number", e.target.value)
                    }
                    placeholder="License number"
                    className="text-sm h-9"
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      ))}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={addEntry}
          className="hover:bg-green-50 hover:text-green-700 hover:border-green-400 active:bg-green-100 active:scale-[0.97] transition-all duration-150 text-sm sm:whitespace-nowrap order-2 sm:order-1"
        >
          Add Another Entry
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
