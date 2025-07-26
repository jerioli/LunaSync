import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSecurity } from '@/hooks/useSecurity';
import {
    AlertTriangle,
    Archive,
    CheckCircle,
    Clock,
    Database,
    HardDrive,
    RefreshCw,
    ShieldAlert,
    Wifi
} from 'lucide-react';
import { useState } from 'react';

const SecurityPage = () => {
  const { securityData, loading, error, refreshSecurityData } = useSecurity();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSecurityData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading security information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>No security data available.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getEncryptionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'database encryption':
        return <Database className="h-5 w-5" />;
      case 'file system encryption':
        return <HardDrive className="h-5 w-5" />;
      case 'communication encryption':
        return <Wifi className="h-5 w-5" />;
      case 'backup encryption':
        return <Archive className="h-5 w-5" />;
      default:
        return <ShieldAlert className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage system security</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          {refreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Overall Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Overall Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Security Score</span>
              <Badge 
                variant="outline"
                className={`text-lg px-3 py-1 ${
                  securityData.overall_status.color === 'green' 
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : securityData.overall_status.color === 'blue'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : securityData.overall_status.color === 'yellow'
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {securityData.overall_status.score}/100 - {securityData.overall_status.level}
              </Badge>
            </div>
            <Progress value={securityData.overall_status.score} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Data Encryption</CardTitle>
                <ShieldAlert className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {securityData.encryption.status}
                </div>
                <p className="text-xs text-muted-foreground">
                  {securityData.encryption.enabled_count}/{securityData.encryption.total_count} systems encrypted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Backup Status</CardTitle>
                <Archive className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {securityData.backup.status}
                </div>
                <p className="text-xs text-muted-foreground">
                  {securityData.backup.backup_size > 0 && formatFileSize(securityData.backup.backup_size)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Last Audit</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {securityData.last_audit.status}
                </div>
                <p className="text-xs text-muted-foreground">
                  Score: {securityData.last_audit.score}/100
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {securityData.incidents.open}
                </div>
                <p className="text-xs text-muted-foreground">
                  Open incidents
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="encryption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encryption Status</CardTitle>
              <CardDescription>Status of encryption across all system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityData.encryption.details.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getEncryptionIcon(item.type)}
                      <div>
                        <p className="font-medium">{item.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.algorithm} • {item.key_strength}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={item.enabled ? "default" : "destructive"}
                      className={item.enabled ? "bg-green-100 text-green-800" : ""}
                    >
                      {item.enabled ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Information</CardTitle>
              <CardDescription>Latest backup status and details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold">{securityData.backup.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Size</p>
                    <p className="text-lg font-semibold">
                      {securityData.backup.backup_size > 0 
                        ? formatFileSize(securityData.backup.backup_size)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-lg font-semibold">
                      {securityData.backup.location || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Backup</p>
                    <p className="text-lg font-semibold">
                      {securityData.backup.last_backup 
                        ? new Date(securityData.backup.last_backup).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Information</CardTitle>
              <CardDescription>Latest security audit results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Audit</p>
                    <p className="text-lg font-semibold">{securityData.last_audit.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Audit Type</p>
                    <p className="text-lg font-semibold">
                      {securityData.last_audit.audit_type || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-lg font-semibold">{securityData.last_audit.score}/100</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-lg font-semibold">
                      {securityData.last_audit.date 
                        ? new Date(securityData.last_audit.date).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>Recent security incidents and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{securityData.incidents.total}</p>
                  <p className="text-sm text-muted-foreground">Total Incidents</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{securityData.incidents.open}</p>
                  <p className="text-sm text-muted-foreground">Open</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{securityData.incidents.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{securityData.incidents.critical}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityPage;
