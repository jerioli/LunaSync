from django.urls import path
from .views import (
    InventoryListCreateView, InventoryDetailView, 
    InventoryTransactionView, LowStockAlertsView, AllTransactionsView,
    InventoryTestView, MedicineRecordListCreateView, MedicineRecordDetailView,
    MedicineStatsView
)

urlpatterns = [
    # Inventory endpoints
    path('test/', InventoryTestView.as_view(), name='inventory-test'),  # GET test endpoint
    path('', InventoryListCreateView.as_view(), name='inventory-list-create'),  # GET/POST
    path('<int:pk>/', InventoryDetailView.as_view(), name='inventory-detail'),  # GET/PUT/DELETE
    path('<int:pk>/transactions/', InventoryTransactionView.as_view(), name='inventory-transactions'),  # GET/POST
    path('transactions/', AllTransactionsView.as_view(), name='all-transactions'),  # GET all transactions
    path('low-stock/', LowStockAlertsView.as_view(), name='inventory-low-stock'),  # GET
    
    # Medicine Record endpoints
    path('medicines/', MedicineRecordListCreateView.as_view(), name='medicine-records-list-create'),  # GET/POST
    path('medicines/<int:pk>/', MedicineRecordDetailView.as_view(), name='medicine-record-detail'),  # GET/PUT/DELETE
    path('medicines/stats/', MedicineStatsView.as_view(), name='medicine-stats'),  # GET statistics and alerts
]