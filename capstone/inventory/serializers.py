from rest_framework import serializers
from .models import Inventory, InventoryTransaction, MedicineRecord

class MedicineRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = MedicineRecord
        fields = [
            'id', 'name', 'dosage', 'description', 'category',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def validate_name(self, value):
        """Validate that medicine name is not empty"""
        if not value.strip():
            raise serializers.ValidationError("Medicine name cannot be empty.")
        return value.strip()

    def validate_dosage(self, value):
        """Validate that dosage is not empty"""
        if not value.strip():
            raise serializers.ValidationError("Dosage cannot be empty.")
        return value.strip()

    def validate(self, data):
        """Validate unique combination of name and dosage"""
        name = data.get('name', '').strip()
        dosage = data.get('dosage', '').strip()
        
        # Check for existing combination (excluding current instance if updating)
        queryset = MedicineRecord.objects.filter(name=name, dosage=dosage)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(
                f"Medicine record with name '{name}' and dosage '{dosage}' already exists."
            )
        
        return data

class InventorySerializer(serializers.ModelSerializer):
    # Read-only calculated fields
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'name', 'description', 'category', 'quantity', 'unit', 
            'minimum_stock', 'unit_price', 'total_value', 'status',
            'batch_number', 'expiry_date', 'supplier', 'supplier_contact',
            'created_at', 'updated_at', 'is_low_stock', 'is_expired', 
            'days_until_expiry'
        ]
        read_only_fields = ['created_at', 'updated_at', 'status', 'total_value']

    def validate_quantity(self, value):
        """Validate that quantity is not negative"""
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value

    def validate_minimum_stock(self, value):
        """Validate that minimum stock is not negative"""
        if value < 0:
            raise serializers.ValidationError("Minimum stock cannot be negative.")
        return value

    def validate_unit_price(self, value):
        """Validate that unit price is not negative"""
        if value < 0:
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value


class InventoryTransactionSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    
    class Meta:
        model = InventoryTransaction
        fields = [
            'id', 'inventory_item', 'inventory_item_name', 'transaction_type',
            'quantity', 'reference', 'notes', 'created_by', 'created_at'
        ]
        read_only_fields = ['created_at']

    def validate_quantity(self, value):
        """Validate quantity based on transaction type"""
        transaction_type = self.initial_data.get('transaction_type')
        
        if transaction_type == 'out' and value > 0:
            # For stock out, quantity should be negative
            return -abs(value)
        elif transaction_type == 'in' and value < 0:
            # For stock in, quantity should be positive
            return abs(value)
        
        return value


class InventoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new inventory items"""
    
    class Meta:
        model = Inventory
        fields = [
            'name', 'description', 'category', 'quantity', 'unit',
            'minimum_stock', 'unit_price', 'batch_number', 'expiry_date',
            'supplier', 'supplier_contact'
        ]

    def validate(self, data):
        """Additional validation for inventory creation"""
        # Check if an item with the same name and batch already exists
        name = data.get('name')
        batch_number = data.get('batch_number')
        
        if name and batch_number:
            existing_item = Inventory.objects.filter(
                name=name, 
                batch_number=batch_number
            ).first()
            
            if existing_item:
                raise serializers.ValidationError(
                    f"An inventory item with name '{name}' and batch '{batch_number}' already exists."
                )
        
        return data


class InventoryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating inventory items"""
    
    class Meta:
        model = Inventory
        fields = [
            'name', 'description', 'category', 'quantity', 'unit',
            'minimum_stock', 'unit_price', 'batch_number', 'expiry_date',
            'supplier', 'supplier_contact'
        ]

    def validate_quantity(self, value):
        """Validate quantity changes"""
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value