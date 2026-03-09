import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "@/contexts/ClinicContext";
import {
  Package,
  Plus,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
// Import sessionManager to ensure global axios configuration is applied
import "@/utils/sessionManager";

// Ensure withCredentials is set for this component
axios.defaults.withCredentials = true;

interface MedicineRecord {
  id: number;
  name: string;
  dosage: string;
  description: string;
  category: string;
  expiration_date?: string;
  alert_months_before: number;
  created_at: string;
  updated_at: string;
  is_near_expiration?: boolean;
  is_expired?: boolean;
  days_until_expiry?: number;
  months_until_expiry?: number;
  alert_status?: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_low_stock?: boolean;
}

interface MedicineTransaction {
  id: number;
  medicine_record: number;
  transaction_type: "added" | "updated" | "discontinued";
  reason?: string;
  performed_by: number;
  created_at: string;
}

type SortField = "name" | "dosage" | "category" | "created_at";
type SortDirection = "asc" | "desc";

const Inventory = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();

  // State management
  const [medicineRecords, setMedicineRecords] = useState<MedicineRecord[]>([]);
  const [transactions, setTransactions] = useState<MedicineTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MedicineRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    description: "",
    category: "tablet", // Default dosage form for medicines
    expiration_date: "",
    alert_months_before: 3, // Default to 3 months
    stock_quantity: 0,
    low_stock_threshold: 10, // Default low stock threshold
  });

  // Check permissions - allow doctors and admins by default, others need permission
  const canManageMedicines =
    currentUser?.role === "doctor" ||
    currentUser?.role === "admin" ||
    currentUser?.can_manage_inventory;

  // Debug logging
  console.log("[MEDICINE RECORDS FRONTEND] Current user:", currentUser);
  console.log(
    "[MEDICINE RECORDS FRONTEND] Can manage medicines:",
    canManageMedicines,
  );
  console.log("[MEDICINE RECORDS FRONTEND] Axios defaults:", {
    baseURL: axios.defaults.baseURL,
    withCredentials: axios.defaults.withCredentials,
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      console.log(
        "[MEDICINE RECORDS FRONTEND] No current user, might need to login",
      );
      return;
    }
    if (!canManageMedicines) {
      console.log(
        "[MEDICINE RECORDS FRONTEND] User doesn't have medicine management permissions",
      );
      return;
    }
    console.log(
      "[MEDICINE RECORDS FRONTEND] User authenticated, fetching data",
    );
    fetchMedicineRecords();
    fetchTransactions();
  }, [currentUser, canManageMedicines]);

  // Check for expiring medicines and create notifications
  useEffect(() => {
    if (medicineRecords.length > 0) {
      const expiringMedicines = medicineRecords.filter(
        (med) => med.is_near_expiration && !med.is_expired,
      );
      const expiredMedicines = medicineRecords.filter((med) => med.is_expired);

      // Show toast notifications for critical items
      if (expiredMedicines.length > 0) {
        toast({
          title: "Expired Medicines",
          description: `${expiredMedicines.length} medicine(s) have expired and need attention`,
          variant: "destructive",
        });
      } else if (expiringMedicines.length > 0) {
        toast({
          title: "Expiring Soon",
          description: `${expiringMedicines.length} medicine(s) are nearing expiration`,
          variant: "destructive",
        });
      }
    }
  }, [medicineRecords, toast]);
  const fetchMedicineRecords = async () => {
    // Don't fetch if user doesn't have permission
    if (!canManageMedicines) {
      console.log(
        "[MEDICINE RECORDS FRONTEND] No permission to fetch medicine records",
      );
      return;
    }

    console.log("[MEDICINE RECORDS FRONTEND] Fetching medicine records...");
    try {
      const response = await axios.get("/inventory/medicines/", {
        withCredentials: true,
      });
      if (response.data.success) {
        setMedicineRecords(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching medicine records:", error);
      toast({
        title: "Error",
        description: "Failed to fetch medicine records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    // Don't fetch if user doesn't have permission
    if (!canManageMedicines) {
      console.log(
        "[MEDICINE RECORDS FRONTEND] No permission to fetch transactions",
      );
      return;
    }

    try {
      const response = await axios.get("/inventory/medicine-transactions/", {
        withCredentials: true,
      });
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: string[] = [];
    const validCategories = [
      "tablet",
      "capsule",
      "syrup",
      "injection",
      "cream",
      "drops",
      "other",
    ];

    if (!formData.name.trim()) errors.push("Medicine name is required");
    if (!formData.dosage.trim()) errors.push("Dosage strength is required");
    if (!formData.category.trim()) {
      errors.push("Dosage form is required");
    } else if (!validCategories.includes(formData.category)) {
      errors.push("Please select a valid dosage form");
    }

    return errors;
  };

  // Handle form submission for adding/editing items
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const url = selectedItem
        ? `/inventory/medicines/${selectedItem.id}/`
        : "/inventory/medicines/";
      const method = selectedItem ? "put" : "post";

      const response = await axios[method](url, formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description:
            response.data.message ||
            (selectedItem
              ? "Medicine updated successfully"
              : "Medicine added successfully"),
        });
        fetchMedicineRecords();
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        resetForm();
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      let errorMessage = "Operation failed";

      if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(", ");
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this medicine record?"))
      return;

    try {
      const response = await axios.delete(`/inventory/medicines/${id}/`, {
        withCredentials: true,
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Medicine record deleted successfully",
        });
        fetchMedicineRecords();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Delete failed",
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      dosage: "",
      description: "",
      category: "tablet",
      expiration_date: "",
      alert_months_before: 3,
      stock_quantity: 0,
      low_stock_threshold: 10,
    });
    setSelectedItem(null);
    setIsSubmitting(false);
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle edit
  const handleEdit = (item: MedicineRecord) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      dosage: item.dosage,
      description: item.description || "",
      category: item.category,
      expiration_date: item.expiration_date || "",
      alert_months_before: item.alert_months_before || 3,
      stock_quantity: item.stock_quantity || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
    });
    setIsEditModalOpen(true);
  };

  // Filter and sort data
  const filteredItems = medicineRecords
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dosage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "created_at") {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue ? bValue.toLowerCase() : "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Get unique categories for filter
  const categories = [...new Set(medicineRecords.map((item) => item.category))];

  if (!canManageMedicines) {
    console.log("[MEDICINE RECORDS FRONTEND] Permission denied:", {
      currentUser,
      can_manage_inventory: currentUser?.can_manage_inventory,
      role: currentUser?.role,
      canManageMedicines,
    });
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don't have permission to access medicine records management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading medicine records...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Inventory</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Manage medicine database
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Medicines
                </p>
                <p className="text-xl sm:text-2xl font-bold">
                  {medicineRecords.length}
                </p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Low Stock
                </p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {medicineRecords.filter((item) => item.is_low_stock).length}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Near Expiration
                </p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">
                  {
                    medicineRecords.filter(
                      (item) => item.is_near_expiration && !item.is_expired,
                    ).length
                  }
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Expired
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {medicineRecords.filter((item) => item.is_expired).length}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue placeholder="Filter by dosage form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dosage Forms</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-[120px] text-xs sm:text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medicine Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Medicine Records</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Medicine Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("dosage")}
                  >
                    <div className="flex items-center gap-2">
                      Dosage Strength
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-2">
                      Dosage Form
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Stock Qty</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Alert Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-2">
                      Date Added
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm font-medium">No results found</p>
                        <p className="text-xs mt-1">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {item.dosage}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-sm bg-gray-100 px-2 py-1 rounded">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span
                            className={`${
                              item.is_low_stock
                                ? "text-orange-600 font-semibold"
                                : "text-gray-600"
                            }`}
                          >
                            {item.stock_quantity ?? "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.expiration_date ? (
                            <span
                              className={`${
                                item.is_expired
                                  ? "text-red-600 font-semibold"
                                  : item.is_near_expiration
                                    ? "text-amber-600 font-semibold"
                                    : "text-gray-600"
                              }`}
                            >
                              {format(
                                new Date(item.expiration_date),
                                "MMM dd, yyyy",
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.is_expired && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expired
                            </span>
                          )}
                          {item.is_near_expiration && !item.is_expired && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Near Expiry
                            </span>
                          )}
                          {!item.is_near_expiration &&
                            !item.is_expired &&
                            item.expiration_date && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                OK
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {item.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View with Accordion */}
          <div className="lg:hidden space-y-3">
            {paginatedItems.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-10 w-10 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No results found</p>
                    <p className="text-xs mt-1 text-center">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              paginatedItems.map((item) => (
                <details key={item.id} className="group border rounded-lg">
                  <summary className="cursor-pointer p-3 sm:p-4 hover:bg-muted/50 transition-colors list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base">
                            {item.name}
                          </h3>
                          <span className="text-xs sm:text-sm font-medium text-blue-600">
                            {item.dosage}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          {item.is_expired && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          )}
                          {item.is_near_expiration && !item.is_expired && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Near Expiry
                            </span>
                          )}
                          {item.is_low_stock && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0" />
                    </div>
                  </summary>

                  <div className="border-t p-3 sm:p-4 space-y-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-600 font-medium">
                          Stock Quantity:
                        </span>
                        <p
                          className={`mt-1 ${
                            item.is_low_stock
                              ? "text-orange-600 font-semibold"
                              : "text-gray-900"
                          }`}
                        >
                          {item.stock_quantity ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">
                          Expiration:
                        </span>
                        <p
                          className={`mt-1 ${
                            item.is_expired
                              ? "text-red-600 font-semibold"
                              : item.is_near_expiration
                                ? "text-amber-600 font-semibold"
                                : "text-gray-900"
                          }`}
                        >
                          {item.expiration_date
                            ? format(
                                new Date(item.expiration_date),
                                "MMM dd, yyyy",
                              )
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">
                          Alert Status:
                        </span>
                        <div className="mt-1">
                          {item.is_expired && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expired
                            </span>
                          )}
                          {item.is_near_expiration && !item.is_expired && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Near Expiry
                            </span>
                          )}
                          {!item.is_near_expiration &&
                            !item.is_expired &&
                            item.expiration_date && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                OK
                              </span>
                            )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">
                          Date Added:
                        </span>
                        <p className="text-gray-900 mt-1">
                          {format(new Date(item.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>

                    {item.description && (
                      <div>
                        <span className="text-gray-600 font-medium text-xs sm:text-sm">
                          Description:
                        </span>
                        <p className="text-gray-700 mt-1 text-xs sm:text-sm">
                          {item.description}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 text-xs sm:text-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
                {totalItems} items
              </div>
              <div className="flex items-center space-x-4 lg:space-x-6">
                <div className="flex w-[100px] items-center justify-center text-xs sm:text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
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

      {/* Add/Edit Medicine Modal */}
      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Medicine" : "Add New Medicine"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Medicine Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Paracetamol"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dosage">Dosage Strength *</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) =>
                    setFormData({ ...formData, dosage: e.target.value })
                  }
                  placeholder="e.g., 500mg, 10ml, 2.5mg"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Dosage Form *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dosage form" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="capsule">Capsule</SelectItem>
                    <SelectItem value="syrup">Syrup</SelectItem>
                    <SelectItem value="injection">Injection</SelectItem>
                    <SelectItem value="cream">Cream/Ointment</SelectItem>
                    <SelectItem value="drops">Drops</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expiration_date">Expiration Date</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiration_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="alert_months_before">Alert Timing</Label>
                <Select
                  value={formData.alert_months_before.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      alert_months_before: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select alert timing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">
                      2 months before expiration
                    </SelectItem>
                    <SelectItem value="3">
                      3 months before expiration
                    </SelectItem>
                    <SelectItem value="4">
                      4 months before expiration
                    </SelectItem>
                    <SelectItem value="5">
                      5 months before expiration
                    </SelectItem>
                    <SelectItem value="6">
                      6 months before expiration
                    </SelectItem>
                    <SelectItem value="7">
                      7 months before expiration
                    </SelectItem>
                    <SelectItem value="8">
                      8 months before expiration
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional information about the medicine (optional)"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : selectedItem ? "Update" : "Add"}{" "}
                Medicine
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
