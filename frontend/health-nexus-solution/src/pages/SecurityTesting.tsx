import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { AlertTriangle, CheckCircle, Clock, Download, FileText, Play, Shield, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SecurityTest {
  id: number;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_run: string;
  duration: number;
  findings: number;
  description: string;
}

interface SecurityMetrics {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  critical_findings: number;
  overall_score: number;
}

const SecurityTesting = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();
  const [tests, setTests] = useState<SecurityTest[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const response = await api.securityTesting.getAll();
      setTests(response.tests);
      setMetrics(response.metrics);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch security testing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (testId: number) => {
    setRunningTests(prev => new Set(prev).add(testId));
    try {
      await api.securityTesting.runTest(testId.toString());
      toast({
        title: "Test Started",
        description: "Security test has been initiated",
      });
      // Refresh data after a short delay
      setTimeout(fetchSecurityData, 2000);
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: "Error",
        description: "Failed to run security test",
        variant: "destructive",
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  if (!currentUser?.can_access_security_testing) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access security testing.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatLastRun = (lastRun: string) => {
    return new Date(lastRun).toLocaleString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading security tests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security Testing
          </h1>
          <p className="text-muted-foreground">
            Run security tests and monitor system vulnerabilities
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <Shield className="mr-2 h-4 w-4" />
          Run All Tests
        </Button>
      </div>

      {/* Security Metrics Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_tests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.passed_tests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.failed_tests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.critical_findings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.overall_score}%</div>
              <Progress value={metrics.overall_score} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tests */}
      <div className="grid gap-4">
        {tests.map(test => (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    {test.name}
                  </CardTitle>
                  <CardDescription>{test.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getRiskLevelColor(test.risk_level)}>
                    {test.risk_level.charAt(0).toUpperCase() + test.risk_level.slice(1)} Risk
                  </Badge>
                  <Badge className={getStatusBadgeColor(test.status)}>
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Type</div>
                  <div className="text-sm">{test.type}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Last Run</div>
                  <div className="text-sm">{formatLastRun(test.last_run)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div className="text-sm">{formatDuration(test.duration)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Findings</div>
                  <div className="text-sm flex items-center gap-1">
                    {test.findings > 0 && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                    {test.findings}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => runTest(test.id)}
                  disabled={runningTests.has(test.id) || test.status === 'running'}
                >
                  <Play className="mr-1 h-3 w-3" />
                  {runningTests.has(test.id) || test.status === 'running' ? 'Running...' : 'Run Test'}
                </Button>
                
                {test.status === 'completed' && (
                  <>
                    <Button variant="outline" size="sm">
                      <FileText className="mr-1 h-3 w-3" />
                      View Report
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Security Tests</h3>
            <p className="text-muted-foreground mb-4">
              No security tests have been configured yet. Set up security testing to monitor your system's security posture.
            </p>
            <Button>
              <Shield className="mr-2 h-4 w-4" />
              Configure Security Tests
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityTesting;
