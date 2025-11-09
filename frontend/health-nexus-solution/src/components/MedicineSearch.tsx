import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import axios from "axios";
import { Check, ChevronsUpDown } from "lucide-react";
import React, { useEffect, useState } from "react";

interface MedicineRecord {
  id: number;
  name: string;
  dosage: string;
  category: string;
  description?: string;
  medicine_name?: string; // Support both field names for compatibility
}

interface MedicineSearchProps {
  value?: string;
  onSelect: (medicine: MedicineRecord | null) => void;
  placeholder?: string;
  className?: string;
}

const MedicineSearch: React.FC<MedicineSearchProps> = ({
  value = "",
  onSelect,
  placeholder = "Search medicine...",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState(value);

  // Fetch medicines from the database
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/inventory/medicines/", {
        withCredentials: true,
      });
      if (response.data.success) {
        setMedicines(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSelect = (medicine: MedicineRecord) => {
    // Normalize the medicine name (support both 'name' and 'medicine_name')
    const medicineName = medicine.name || medicine.medicine_name || "";
    setSearchValue(medicineName);
    setOpen(false);
    // Send normalized medicine object
    onSelect({
      ...medicine,
      name: medicineName
    });
  };

  const handleClear = () => {
    setSearchValue("");
    onSelect(null);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {searchValue || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search medicines..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading..." : "No medicine found."}
              </CommandEmpty>
              <CommandGroup>
                {medicines
                  .filter((medicine) => {
                    const name = medicine.name || medicine.medicine_name || "";
                    return (
                      name.toLowerCase().includes(searchValue.toLowerCase()) ||
                      medicine.dosage.toLowerCase().includes(searchValue.toLowerCase()) ||
                      medicine.category.toLowerCase().includes(searchValue.toLowerCase())
                    );
                  })
                  .map((medicine) => {
                    const medicineName = medicine.name || medicine.medicine_name || "";
                    return (
                      <CommandItem
                        key={medicine.id}
                        value={medicineName}
                        onSelect={() => handleSelect(medicine)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            searchValue === medicineName ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{medicineName}</span>
                          <div className="flex gap-2 text-sm text-gray-500">
                            <span>{medicine.dosage}</span>
                            <span className="capitalize">({medicine.category})</span>
                          </div>
                          {medicine.description && (
                            <span className="text-xs text-gray-400">
                              {medicine.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {searchValue && (
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="mt-1 h-6 text-xs"
          onClick={handleClear}
        >
          Clear selection
        </Button>
      )}
    </div>
  );
};

export default MedicineSearch;