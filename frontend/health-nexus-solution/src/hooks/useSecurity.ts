import axios from 'axios';
import { useEffect, useState } from 'react';
import { ENV } from '@/config/env';

interface EncryptionStatus {
  status: string;
  enabled_count: number;
  total_count: number;
  details: Array<{
    type: string;
    enabled: boolean;
    algorithm: string;
    key_strength: string;
  }>;
}

interface BackupStatus {
  status: string;
  last_backup: string | null;
  backup_size: number;
  location: string | null;
}

interface AuditStatus {
  status: string;
  audit_type: string | null;
  score: number;
  date: string | null;
}

interface IncidentStats {
  total: number;
  open: number;
  resolved: number;
  critical: number;
}

interface SecuritySettings {
  encryption_enabled: boolean;
  auto_backup_enabled: boolean;
  audit_logging_enabled: boolean;
  session_timeout: number;
  max_login_attempts: number;
}

interface OverallStatus {
  level: string;
  score: number;
  color: string;
}

interface SecurityData {
  encryption: EncryptionStatus;
  backup: BackupStatus;
  last_audit: AuditStatus;
  incidents: IncidentStats;
  settings: SecuritySettings;
  overall_status: OverallStatus;
}

export const useSecurity = () => {
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ENV.API_URL}/security-status/`);
      
      if (response.data.status === 'success') {
        setSecurityData(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch security data');
      }
    } catch (err: any) {
      console.error('Error fetching security data:', err);
      setError(err.response?.data?.message || 'Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const refreshSecurityData = () => {
    fetchSecurityData();
  };

  return {
    securityData,
    loading,
    error,
    refreshSecurityData,
  };
};
