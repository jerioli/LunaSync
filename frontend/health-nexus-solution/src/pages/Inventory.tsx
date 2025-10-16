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
  created_at: string;
  updated_at: string;
}

interface MedicineTransaction {
  id: number;
  medicine_record: number;
  transaction_type: "added" | "updated" | "discontinued";
  reason?: string;
  performed_by: number;
  created_at: string;
}

type SortField =
  | "name"
  | "dosage"
  | "category"
  | "created_at";
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
    category: "tablet", // Default category for medicines
  });

  // Check permissions - allow doctors and admins by default, others need permission
  const canManageMedicines =
    currentUser?.role === "doctor" ||
    currentUser?.role === "admin" ||
    currentUser?.can_manage_inventory;

  // Debug logging
  console.log("[MEDICINE RECORDS FRONTEND] Current user:", currentUser);
  console.log("[MEDICINE RECORDS FRONTEND] Can manage medicines:", canManageMedicines);
  console.log("[MEDICINE RECORDS FRONTEND] Axios defaults:", {
    baseURL: axios.defaults.baseURL,
    withCredentials: axios.defaults.withCredentials,
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      console.log("[MEDICINE RECORDS FRONTEND] No current user, might need to login");
      return;
    }
    if (!canManageMedicines) {
      console.log(
        "[MEDICINE RECORDS FRONTEND] User doesn't have medicine management permissions"
      );
      return;
    }
    console.log("[MEDICINE RECORDS FRONTEND] User authenticated, fetching data");
    fetchMedicineRecords();
    fetchTransactions();
  }, [currentUser, canManageMedicines]);
  const fetchMedicineRecords = async () => {
    // Don't fetch if user doesn't have permission
    if (!canManageMedicines) {
      console.log(
        "[MEDICINE RECORDS FRONTEND] No permission to fetch medicine records"
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
      console.log("[MEDICINE RECORDS FRONTEND] No permission to fetch transactions");
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
    const validCategories = ["tablet", "capsule", "syrup", "injection", "cream", "drops", "other"];

    if (!formData.name.trim()) errors.push("Medicine name is required");
    if (!formData.dosage.trim()) errors.push("Dosage is required");
    if (!formData.category.trim()) {
      errors.push("Category is required");
    } else if (!validCategories.includes(formData.category)) {
      errors.push("Please select a valid category");
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
    if (!confirm("Are you sure you want to delete this medicine record?")) return;

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Medicine Records</h1>
          <p className="text-gray-600">Manage medicine database for e-prescription creation</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Medicines</p>
                <p className="text-2xl font-bold">{medicineRecords.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-green-600">
                  {categories.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Additions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    medicineRecords.filter((item) => {
                      const createdDate = new Date(item.created_at);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return createdDate >= weekAgo;
                    }).length
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
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
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medicine Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Medicine Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                      Dosage
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-2">
                      Category
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
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
                {paginatedItems.map((item) => (
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
                {totalItems} items
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
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
                <Label htmlFor="dosage">Dosage *</Label>
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
              <div className="md:col-span-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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
