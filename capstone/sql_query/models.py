from django.db import models
from django.conf import settings

class SQLQueryLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    query = models.TextField()
    success = models.BooleanField(default=False)
    rows_affected = models.IntegerField(default=0)
    error = models.TextField(null=True, blank=True)
    executed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sql_query_logs'
        ordering = ['-executed_at']
    
    def __str__(self):
        return f"{self.user} - {self.executed_at} - {'Success' if self.success else 'Failed'}"
