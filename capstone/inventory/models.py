from django.db import models
from django.utils import timezone
from security_app.fields import EncryptedCharField, EncryptedTextField

class InventoryManager(models.Manager):
    def get_queryset(self):
        """Return only non-deleted inventory items by default"""
        return super().get_queryset().filter(is_deleted=False)
    
    def all_including_deleted(self):
        """Return all inventory items including deleted ones"""
        return super().get_queryset()
    
    def deleted_only(self):
        """Return only deleted inventory items"""
        return super().get_queryset().filter(is_deleted=True)

class Inventory(models.Model):
    CATEGORY_CHOICES = [
        ('medication', 'Medication'),
        ('supplies', 'Medical Supplies'),
        ('equipment', 'Equipment'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('in_stock', 'In Stock'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('expired', 'Expired'),
    ]
    
    # Basic inventory information
    name = EncryptedCharField(max_length=200)
    description = EncryptedTextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='medication')
    
    # Stock management
    quantity = models.IntegerField(default=0)
    unit = EncryptedCharField(max_length=50, default='pieces')  # pieces, bottles, boxes, etc.
    minimum_stock = models.IntegerField(default=10)  # Alert when stock goes below this
    
    # Pricing
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_stock')
    batch_number = EncryptedCharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    
    # Supplier information
    supplier = EncryptedCharField(max_length=200, blank=True, null=True)
    supplier_contact = EncryptedCharField(max_length=100, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Soft delete fields
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Custom manager
    objects = InventoryManager()
    
    class Meta:
        db_table = 'inventory'
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'
        ordering = ['name']
    
    def save(self, *args, **kwargs):
        # Auto-calculate total value
        self.total_value = self.quantity * self.unit_price
        
        # Auto-update status based on quantity and expiry
        if self.expiry_date and self.expiry_date <= timezone.now().date():
            self.status = 'expired'
        elif self.quantity <= 0:
            self.status = 'out_of_stock'
        elif self.quantity <= self.minimum_stock:
            self.status = 'low_stock'
        else:
            self.status = 'in_stock'
            
        super().save(*args, **kwargs)
    
    def soft_delete(self):
        """Soft delete the inventory item"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
    
    def restore(self):
        """Restore a soft-deleted inventory item"""
        self.is_deleted = False
        self.deleted_at = None
        self.save()
    
    def is_low_stock(self):
        """Check if the item is low in stock"""
        return self.quantity <= self.minimum_stock
    
    def is_expired(self):
        """Check if the item is expired"""
        if self.expiry_date:
            return self.expiry_date <= timezone.now().date()
        return False
    
    def days_until_expiry(self):
        """Calculate days until expiry"""
        if self.expiry_date:
            delta = self.expiry_date - timezone.now().date()
            return delta.days
        return None
    
    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"


class InventoryTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
        ('transfer', 'Transfer'),
    ]
    
    inventory_item = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()  # Positive for stock in, negative for stock out
    reference = EncryptedCharField(max_length=200, blank=True, null=True)  # Invoice, prescription, etc.
    notes = EncryptedTextField(blank=True, null=True)
    
    # User tracking
    created_by = models.CharField(max_length=100)  # Username of the person who made the transaction
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'inventory_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.inventory_item.name} - {self.transaction_type} ({self.quantity})"
