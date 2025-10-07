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

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  minimum_stock: number;
  unit_price: number;
  total_value: number;
  status: string;
  batch_number?: string;
  expiry_date?: string;
  supplier?: string;
  supplier_contact?: string;
  created_at: string;
  updated_at: string;
}

interface InventoryTransaction {
  id: number;
  inventory_item: number;
  transaction_type: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string;
  reference_number?: string;
  performed_by: number;
  created_at: string;
}

type SortField =
  | "name"
  | "category"
  | "current_quantity"
  | "status"
  | "expiry_date"
  | "created_at";
type SortDirection = "asc" | "desc";

const Inventory = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();

  // State management
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "medication", // Default to medication for clinic
    quantity: 0, // Actual count of individual medicines
    minimum_stock: 0, // Minimum individual units to keep in stock
    unit: "tablets", // Default unit for medicines (tablets, capsules, ml, etc.)
    unit_price: "", // Price per individual unit
    expiry_date: "",
    batch_number: "",
  });

  const [transactionData, setTransactionData] = useState({
    transaction_type: "in" as "in" | "out" | "adjustment",
    quantity: 0,
    reason: "",
    reference_number: "",
  });

  // Check permissions - allow doctors and admins by default, others need permission
  const canManageInventory =
    currentUser?.role === "doctor" ||
    currentUser?.role === "admin" ||
    currentUser?.can_manage_inventory;

  // Debug logging
  console.log("[INVENTORY FRONTEND] Current user:", currentUser);
  console.log("[INVENTORY FRONTEND] Can manage inventory:", canManageInventory);
  console.log("[INVENTORY FRONTEND] Axios defaults:", {
    baseURL: axios.defaults.baseURL,
    withCredentials: axios.defaults.withCredentials,
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      console.log("[INVENTORY FRONTEND] No current user, might need to login");
      return;
    }
    if (!canManageInventory) {
      console.log(
        "[INVENTORY FRONTEND] User doesn't have inventory permissions"
      );
      return;
    }
    console.log("[INVENTORY FRONTEND] User authenticated, fetching data");
    fetchInventoryItems();
    fetchTransactions();
  }, [currentUser, canManageInventory]);
  const fetchInventoryItems = async () => {
    // Don't fetch if user doesn't have permission
    if (!canManageInventory) {
      console.log(
        "[INVENTORY FRONTEND] No permission to fetch inventory items"
      );
      return;
    }

    console.log("[INVENTORY FRONTEND] Fetching inventory items...");
    try {
      const response = await axios.get("/inventory/", {
        withCredentials: true,
      });
      if (response.data.success) {
        setInventoryItems(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    // Don't fetch if user doesn't have permission
    if (!canManageInventory) {
      console.log("[INVENTORY FRONTEND] No permission to fetch transactions");
      return;
    }

    try {
      const response = await axios.get("/inventory/transactions/", {
        withCredentials: true,
      });
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  useEffect(() => {
    if (canManageInventory) {
      fetchInventoryItems();
      fetchTransactions();
    }
  }, [canManageInventory]);

  // Form validation
  const validateForm = () => {
    const errors: string[] = [];
    const validCategories = ["medication", "supplies", "equipment", "other"];

    if (!formData.name.trim()) errors.push("Name is required");
    if (!formData.category.trim()) {
      errors.push("Category is required");
    } else if (!validCategories.includes(formData.category)) {
      errors.push("Please select a valid category");
    }
    if (!formData.unit.trim()) errors.push("Unit is required");
    if (formData.quantity < 0) errors.push("Quantity cannot be negative");
    if (formData.minimum_stock < 0)
      errors.push("Minimum stock cannot be negative");
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      errors.push("Unit price must be greater than 0");
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
        ? `/inventory/${selectedItem.id}/`
        : "/inventory/";
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
              ? "Item updated successfully"
              : "Item added successfully"),
        });
        fetchInventoryItems();
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

  // Handle transaction submission
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `/inventory/${selectedItem?.id}/transactions/`,
        transactionData,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Transaction recorded successfully",
        });
        fetchInventoryItems();
        fetchTransactions();
        setIsTransactionModalOpen(false);
        setTransactionData({
          transaction_type: "in",
          quantity: 0,
          reason: "",
          reference_number: "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Transaction failed",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await axios.delete(`/inventory/${id}/`, {
        withCredentials: true,
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Item deleted successfully",
        });
        fetchInventoryItems();
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
      description: "",
      category: "medication",
      quantity: 0,
      minimum_stock: 0,
      unit: "tablets",
      unit_price: "",
      expiry_date: "",
      batch_number: "",
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
  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category,
      quantity: item.quantity,
      minimum_stock: item.minimum_stock,
      unit: item.unit,
      unit_price: item.unit_price.toString(),
      expiry_date: item.expiry_date || "",
      batch_number: item.batch_number || "",
    });
    setIsEditModalOpen(true);
  };

  // Handle transaction
  const handleTransaction = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsTransactionModalOpen(true);
  };

  // Filter and sort data
  const filteredItems = inventoryItems
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || item.status === filterStatus;
      const matchesCategory =
        filterCategory === "all" || item.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "expiry_date" || sortField === "created_at") {
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
  const categories = [...new Set(inventoryItems.map((item) => item.category))];

  // Status icon helper
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "out_of_stock":
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (!canManageInventory) {
    console.log("[INVENTORY FRONTEND] Permission denied:", {
      currentUser,
      can_manage_inventory: currentUser?.can_manage_inventory,
      role: currentUser?.role,
      canManageInventory,
    });
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don't have permission to access inventory management.
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
        <div className="text-center">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Medication Inventory</h1>
          <p className="text-gray-600">Manage your clinic's medication stock</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{inventoryItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    inventoryItems.filter((item) => item.status === "in_stock")
                      .length
                  }
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
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {
                    inventoryItems.filter((item) => item.status === "low_stock")
                      .length
                  }
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    inventoryItems.filter(
                      (item) => item.status === "out_of_stock"
                    ).length
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
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
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
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
                      Name
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
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("current_quantity")}
                  >
                    <div className="flex items-center gap-2">
                      Quantity
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("expiry_date")}
                  >
                    <div className="flex items-center gap-2">
                      Expiry Date
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
                      <div>
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div>
                        <span
                          className={`font-medium ${
                            item.status === "out_of_stock"
                              ? "text-red-600"
                              : item.status === "low_stock"
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {item.quantity}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          {item.unit}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {item.minimum_stock}
                      </div>
                    </TableCell>
                    <TableCell>${item.unit_price}</TableCell>
                    <TableCell>${item.total_value}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm capitalize">
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.expiry_date
                        ? format(new Date(item.expiry_date), "MMM dd, yyyy")
                        : "N/A"}
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
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransaction(item)}
                        >
                          <TrendingUp className="h-4 w-4" />
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

      {/* Add/Edit Item Modal */}
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
              {selectedItem ? "Edit Item" : "Add New Item"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
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
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="supplies">Medical Supplies</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      unit: value,
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablets">Tablets</SelectItem>
                    <SelectItem value="capsules">Capsules</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="syrup_bottles">Syrup Bottles</SelectItem>
                    <SelectItem value="vials">Vials</SelectItem>
                    <SelectItem value="ampoules">Ampoules</SelectItem>
                    <SelectItem value="patches">Patches</SelectItem>
                    <SelectItem value="drops">Drops</SelectItem>
                    <SelectItem value="sachets">Sachets</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">
                  Current Quantity (Individual Units) *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="minimum_stock">
                  Minimum Stock Alert Level *
                </Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimum_stock: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit_price">Price Per Unit *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_price: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="batch_number">Batch Number</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) =>
                    setFormData({ ...formData, batch_number: e.target.value })
                  }
                />
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
                Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog
        open={isTransactionModalOpen}
        onOpenChange={setIsTransactionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <Select
                value={transactionData.transaction_type}
                onValueChange={(value: "in" | "out" | "adjustment") =>
                  setTransactionData({
                    ...transactionData,
                    transaction_type: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={transactionData.quantity}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={transactionData.reference_number}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    reference_number: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={transactionData.reason}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    reason: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTransactionModalOpen(false);
                  setTransactionData({
                    transaction_type: "in",
                    quantity: 0,
                    reason: "",
                    reference_number: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Record Transaction</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
