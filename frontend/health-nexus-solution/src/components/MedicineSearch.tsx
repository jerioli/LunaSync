import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface MedicineRecord {
  id: number;
  name: string;
  dosage: string;
  category: string;
  description?: string;
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
    setSearchValue(medicine.name);
    setOpen(false);
    onSelect(medicine);
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
                  .filter((medicine) =>
                    medicine.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                    medicine.dosage.toLowerCase().includes(searchValue.toLowerCase()) ||
                    medicine.category.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .map((medicine) => (
                    <CommandItem
                      key={medicine.id}
                      value={medicine.name}
                      onSelect={() => handleSelect(medicine)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          searchValue === medicine.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{medicine.name}</span>
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
                  ))}
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