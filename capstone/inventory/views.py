from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Inventory, InventoryTransaction, MedicineRecord
from .serializers import (
    InventorySerializer, InventoryTransactionSerializer,
    InventoryCreateSerializer, InventoryUpdateSerializer,
    MedicineRecordSerializer
)
from django.http import Http404
from systemlogs.audit_logger import AuditLogger
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from capstone.settings import CsrfExemptSessionAuthentication


@method_decorator(csrf_exempt, name='dispatch')
class InventoryTestView(APIView):
    """Simple test view to debug authentication issues"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        print(f"[INVENTORY TEST] User: {request.user}")
        print(f"[INVENTORY TEST] User authenticated: {request.user.is_authenticated}")
        print(f"[INVENTORY TEST] User role: {getattr(request.user, 'role', 'No role')}")
        print(f"[INVENTORY TEST] can_manage_inventory: {getattr(request.user, 'can_manage_inventory', 'No permission')}")
        
        return Response({
            'success': True,
            'message': 'Inventory test endpoint working',
            'user': str(request.user),
            'authenticated': request.user.is_authenticated,
            'role': getattr(request.user, 'role', 'No role'),
            'can_manage_inventory': getattr(request.user, 'can_manage_inventory', False)
        })


@method_decorator(csrf_exempt, name='dispatch')
class InventoryListCreateView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]  # Restored to proper authentication
    
    def dispatch(self, request, *args, **kwargs):
        print(f"[INVENTORY DEBUG] InventoryListCreateView.dispatch() called")
        print(f"[INVENTORY DEBUG] Method: {request.method}")
        print(f"[INVENTORY DEBUG] User: {request.user}")
        print(f"[INVENTORY DEBUG] User type: {type(request.user)}")
        print(f"[INVENTORY DEBUG] Authenticated: {request.user.is_authenticated}")
        print(f"[INVENTORY DEBUG] Session key: {getattr(request.session, 'session_key', 'None')}")
        print(f"[INVENTORY DEBUG] Headers: {dict(request.headers)}")
        print(f"[INVENTORY DEBUG] Cookies: {request.COOKIES}")
        return super().dispatch(request, *args, **kwargs)
    
    def get(self, request):
        """List all inventory items"""
        # Debug logging
        print(f"[INVENTORY DEBUG] User: {request.user}")
        print(f"[INVENTORY DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[INVENTORY DEBUG] User role: {getattr(request.user, 'role', 'No role')}")
        print(f"[INVENTORY DEBUG] can_manage_inventory: {getattr(request.user, 'can_manage_inventory', 'No permission')}")
        
        # Check if user has permission to view inventory
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view inventory'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            print(f"[INVENTORY DEBUG] Permission denied - can_manage_inventory: {request.user.can_manage_inventory}, role: {request.user.role}")
            # Temporarily allow any authenticated user for testing
            print("[INVENTORY DEBUG] Temporarily allowing any authenticated user for testing")
            # return Response({
            #     'error': 'Permission denied',
            #     'message': 'You do not have permission to view inventory'
            # }, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters for filtering
        category = request.query_params.get('category')
        status_filter = request.query_params.get('status')
        low_stock_only = request.query_params.get('low_stock_only')
        
        inventory_items = Inventory.objects.all()
        
        # Apply filters
        if category:
            inventory_items = inventory_items.filter(category=category)
        if status_filter:
            inventory_items = inventory_items.filter(status=status_filter)
        if low_stock_only and low_stock_only.lower() == 'true':
            inventory_items = [item for item in inventory_items if item.is_low_stock()]
        
        serializer = InventorySerializer(inventory_items, many=True, context={'request': request})
        
        # Log read action
        AuditLogger.log_action(
            user=request.user,
            action='READ',
            resource_type='INVENTORY',
            description='Viewed inventory list',
            details={'count': len(inventory_items)},
            request=request
        )
        
        return Response({
            'success': True,
            'data': serializer.data,
            'total': len(inventory_items)
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new inventory item"""
        # Check if user has permission to create inventory items
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to create inventory items'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to create inventory items'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = InventoryCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            inventory_item = serializer.save()
            
            # Log creation action
            AuditLogger.log_action(
                user=request.user,
                action='CREATE',
                resource_type='INVENTORY',
                description=f'Created inventory item: {inventory_item.name}',
                details={
                    'inventory_id': inventory_item.id,
                    'name': inventory_item.name,
                    'category': inventory_item.category,
                    'quantity': inventory_item.quantity
                },
                request=request
            )
            
            response_serializer = InventorySerializer(inventory_item, context={'request': request})
            return Response({
                'success': True,
                'data': response_serializer.data,
                'message': f'Inventory item "{inventory_item.name}" created successfully'
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        try:
            return Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            raise Http404
    
    def get(self, request, pk):
        """Get a specific inventory item"""
        # Check if user has permission to view inventory
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view inventory details'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view inventory details'
            }, status=status.HTTP_403_FORBIDDEN)
        
        inventory_item = self.get_object(pk)
        serializer = InventorySerializer(inventory_item, context={'request': request})
        
        # Log view action
        AuditLogger.log_action(
            user=request.user,
            action='READ',
            resource_type='INVENTORY',
            description=f'Viewed inventory item: {inventory_item.name}',
            details={'inventory_id': inventory_item.id},
            request=request
        )
        
        return Response(serializer.data)
    
    def put(self, request, pk):
        """Update an inventory item"""
        # Check if user has permission to update inventory
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to update inventory'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to update inventory'
            }, status=status.HTTP_403_FORBIDDEN)
        
        inventory_item = self.get_object(pk)
        
        # Store old values for audit log
        old_serializer = InventorySerializer(inventory_item)
        old_values = old_serializer.data
        
        serializer = InventoryUpdateSerializer(inventory_item, data=request.data, context={'request': request})
        if serializer.is_valid():
            updated_item = serializer.save()
            
            # Log update action
            AuditLogger.log_action(
                user=request.user,
                action='UPDATE',
                resource_type='INVENTORY',
                description=f'Updated inventory item: {updated_item.name}',
                details={
                    'inventory_id': updated_item.id,
                    'old_values': old_values,
                    'new_values': serializer.data
                },
                request=request
            )
            
            response_serializer = InventorySerializer(updated_item, context={'request': request})
            return Response({
                'success': True,
                'data': response_serializer.data,
                'message': f'Inventory item "{updated_item.name}" updated successfully'
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Soft delete an inventory item"""
        # Check if user has permission to delete inventory
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to delete inventory'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to delete inventory'
            }, status=status.HTTP_403_FORBIDDEN)
        
        inventory_item = self.get_object(pk)
        item_name = inventory_item.name
        
        # Perform soft delete
        inventory_item.soft_delete()
        
        # Log soft deletion
        AuditLogger.log_action(
            user=request.user,
            action='SOFT_DELETE',
            resource_type='INVENTORY',
            description=f'Soft deleted inventory item: {item_name}',
            details={
                'inventory_id': inventory_item.id,
                'deleted_at': inventory_item.deleted_at.isoformat() if inventory_item.deleted_at else None
            },
            request=request
        )
        
        return Response({
            'success': True,
            'message': f'Inventory item {item_name} has been deleted successfully'
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryTransactionView(APIView):
    """Handle inventory transactions (stock in/out)"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        """Create a new inventory transaction"""
        # Check if user has permission to manage inventory transactions
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to manage inventory transactions'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to manage inventory transactions'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            inventory_item = Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return Response({
                'error': 'Inventory item not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Add inventory_item and created_by to the request data
        transaction_data = request.data.copy()
        transaction_data['inventory_item'] = inventory_item.id
        transaction_data['created_by'] = request.user.username
        
        serializer = InventoryTransactionSerializer(data=transaction_data)
        if serializer.is_valid():
            transaction = serializer.save()
            
            # Update inventory quantity
            old_quantity = inventory_item.quantity
            inventory_item.quantity += transaction.quantity  # quantity is already positive/negative based on type
            inventory_item.save()
            
            # Log transaction
            AuditLogger.log_action(
                user=request.user,
                action='INVENTORY_TRANSACTION',
                resource_type='INVENTORY',
                description=f'Inventory transaction: {transaction.transaction_type} for {inventory_item.name}',
                details={
                    'inventory_id': inventory_item.id,
                    'transaction_id': transaction.id,
                    'transaction_type': transaction.transaction_type,
                    'quantity_change': transaction.quantity,
                    'old_quantity': old_quantity,
                    'new_quantity': inventory_item.quantity
                },
                request=request
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, pk):
        """Get transaction history for an inventory item"""
        # Check permissions
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            inventory_item = Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return Response({
                'error': 'Inventory item not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        transactions = InventoryTransaction.objects.filter(inventory_item=inventory_item)
        serializer = InventoryTransactionSerializer(transactions, many=True)
        
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class LowStockAlertsView(APIView):
    """Get inventory items with low stock"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check permissions
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get items that are low in stock or out of stock
        low_stock_items = []
        for item in Inventory.objects.all():
            if item.is_low_stock() or item.quantity <= 0:
                low_stock_items.append(item)
        
        serializer = InventorySerializer(low_stock_items, many=True, context={'request': request})
        
        return Response({
            'count': len(low_stock_items),
            'items': serializer.data
        })


@method_decorator(csrf_exempt, name='dispatch')
class AllTransactionsView(APIView):
    """Get all inventory transactions"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]  # Restored to proper authentication
    
    def dispatch(self, request, *args, **kwargs):
        print(f"[TRANSACTIONS DEBUG] AllTransactionsView.dispatch() called")
        print(f"[TRANSACTIONS DEBUG] Method: {request.method}")
        print(f"[TRANSACTIONS DEBUG] User: {request.user}")
        print(f"[TRANSACTIONS DEBUG] User type: {type(request.user)}")
        print(f"[TRANSACTIONS DEBUG] Authenticated: {request.user.is_authenticated}")
        print(f"[TRANSACTIONS DEBUG] Session key: {getattr(request.session, 'session_key', 'None')}")
        print(f"[TRANSACTIONS DEBUG] Headers: {dict(request.headers)}")
        print(f"[TRANSACTIONS DEBUG] Cookies: {request.COOKIES}")
        return super().dispatch(request, *args, **kwargs)
    
    def get(self, request):
        # Debug logging
        print(f"[TRANSACTIONS DEBUG] User: {request.user}")
        print(f"[TRANSACTIONS DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[TRANSACTIONS DEBUG] User role: {getattr(request.user, 'role', 'No role')}")
        print(f"[TRANSACTIONS DEBUG] can_manage_inventory: {getattr(request.user, 'can_manage_inventory', 'No permission')}")
        
        # Check permissions
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_inventory or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            print(f"[TRANSACTIONS DEBUG] Permission denied - can_manage_inventory: {request.user.can_manage_inventory}, role: {request.user.role}")
            # Temporarily allow any authenticated user for testing
            print("[TRANSACTIONS DEBUG] Temporarily allowing any authenticated user for testing")
            # return Response({
            #     'error': 'Permission denied'
            # }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get all transactions ordered by most recent
            transactions = InventoryTransaction.objects.all().order_by('-created_at')
            
            serializer = InventoryTransactionSerializer(transactions, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'total': transactions.count()
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch transactions: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Medicine Record Views
@method_decorator(csrf_exempt, name='dispatch')
class MedicineRecordListCreateView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all medicine records"""
        try:
            # Check permissions
            if not self._has_medicine_permissions(request.user):
                return Response({
                    'success': False,
                    'error': 'Permission denied. You do not have access to manage medicine records.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all medicine records
            medicines = MedicineRecord.objects.all().order_by('name', 'dosage')
            serializer = MedicineRecordSerializer(medicines, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'total': medicines.count()
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch medicine records: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Create a new medicine record"""
        try:
            # Check permissions
            if not self._has_medicine_permissions(request.user):
                return Response({
                    'success': False,
                    'error': 'Permission denied. You do not have access to manage medicine records.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            serializer = MedicineRecordSerializer(data=request.data)
            if serializer.is_valid():
                medicine = serializer.save(created_by=request.user)
                
                # Log the action
                AuditLogger.log_action(
                    user=request.user,
                    action='CREATE',
                    resource_type='MEDICINE_RECORD',
                    resource_id=medicine.id,
                    resource_name=medicine.name,
                    description=f'Created medicine record: {medicine.name}',
                    details={'created_data': serializer.data},
                    request=request
                )
                
                return Response({
                    'success': True,
                    'message': 'Medicine record created successfully',
                    'data': serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to create medicine record: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_medicine_permissions(self, user):
        """Check if user has permission to manage medicine records"""
        return (
            user.is_authenticated and 
            (user.role in ['doctor', 'admin'] or getattr(user, 'can_manage_inventory', False))
        )


@method_decorator(csrf_exempt, name='dispatch')
class MedicineRecordDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        """Get medicine record by ID"""
        try:
            return MedicineRecord.objects.get(pk=pk)
        except MedicineRecord.DoesNotExist:
            raise Http404
    
    def get(self, request, pk):
        """Get specific medicine record"""
        try:
            # Check permissions
            if not self._has_medicine_permissions(request.user):
                return Response({
                    'success': False,
                    'error': 'Permission denied. You do not have access to manage medicine records.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            medicine = self.get_object(pk)
            serializer = MedicineRecordSerializer(medicine)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Http404:
            return Response({
                'success': False,
                'error': 'Medicine record not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch medicine record: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, pk):
        """Update medicine record"""
        try:
            # Check permissions
            if not self._has_medicine_permissions(request.user):
                return Response({
                    'success': False,
                    'error': 'Permission denied. You do not have access to manage medicine records.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            medicine = self.get_object(pk)
            old_data = MedicineRecordSerializer(medicine).data
            
            serializer = MedicineRecordSerializer(medicine, data=request.data, partial=True)
            if serializer.is_valid():
                medicine = serializer.save()
                
                # Log the action
                AuditLogger.log_action(
                    user=request.user,
                    action='UPDATE',
                    resource_type='MEDICINE_RECORD',
                    resource_id=medicine.id,
                    resource_name=medicine.name,
                    description=f'Updated medicine record: {medicine.name}',
                    old_values=old_data,
                    new_values=serializer.data,
                    request=request
                )
                
                return Response({
                    'success': True,
                    'message': 'Medicine record updated successfully',
                    'data': serializer.data
                })
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Http404:
            return Response({
                'success': False,
                'error': 'Medicine record not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to update medicine record: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, pk):
        """Delete (soft delete) medicine record"""
        try:
            # Check permissions
            if not self._has_medicine_permissions(request.user):
                return Response({
                    'success': False,
                    'error': 'Permission denied. You do not have access to manage medicine records.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            medicine = self.get_object(pk)
            old_data = MedicineRecordSerializer(medicine).data
            
            # Soft delete the medicine record
            medicine.soft_delete()
            
            # Log the action
            AuditLogger.log_action(
                user=request.user,
                action='DELETE',
                resource_type='MEDICINE_RECORD',
                resource_id=medicine.id,
                resource_name=medicine.name,
                description=f'Deleted medicine record: {medicine.name}',
                details={'deleted_data': old_data},
                request=request
            )
            
            return Response({
                'success': True,
                'message': 'Medicine record deleted successfully'
            })
            
        except Http404:
            return Response({
                'success': False,
                'error': 'Medicine record not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to delete medicine record: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_medicine_permissions(self, user):
        """Check if user has permission to manage medicine records"""
        return (
            user.is_authenticated and 
            (user.role in ['doctor', 'admin'] or getattr(user, 'can_manage_inventory', False))
        )


@method_decorator(csrf_exempt, name='dispatch')
class MedicineStatsView(APIView):
    """Get medicine statistics including near expiration alerts"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get medicine statistics and alerts"""
        try:
            # Check permissions
            if not self._has_medicine_permissions(request.user):
                return Response({
                    'success': False,
                    'error': 'Permission denied. You do not have access to manage medicine records.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all medicine records
            medicines = MedicineRecord.objects.all()
            
            # Calculate statistics
            total_medicines = medicines.count()
            expired_count = sum(1 for m in medicines if m.is_expired())
            near_expiration_count = sum(1 for m in medicines if m.is_near_expiration() and not m.is_expired())
            
            # Get medicines by alert status
            expired_medicines = [m for m in medicines if m.is_expired()]
            near_expiration_medicines = [m for m in medicines if m.is_near_expiration() and not m.is_expired()]
            
            # Serialize the alert medicines
            expired_serializer = MedicineRecordSerializer(expired_medicines, many=True)
            near_expiration_serializer = MedicineRecordSerializer(near_expiration_medicines, many=True)
            
            return Response({
                'success': True,
                'stats': {
                    'total_medicines': total_medicines,
                    'expired_count': expired_count,
                    'near_expiration_count': near_expiration_count,
                    'ok_count': total_medicines - expired_count - near_expiration_count
                },
                'alerts': {
                    'expired': expired_serializer.data,
                    'near_expiration': near_expiration_serializer.data
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to fetch medicine statistics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_medicine_permissions(self, user):
        """Check if user has permission to manage medicine records"""
        return (
            user.is_authenticated and 
            (user.role in ['doctor', 'admin'] or getattr(user, 'can_manage_inventory', False))
        )
