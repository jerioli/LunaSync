import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { CheckCircle, Clock, Plug, Settings, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Integration {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  last_sync: string;
  config: Record<string, any>;
}

const Integrations = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await api.integrations.getAll();
      setIntegrations(response.integrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch integrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser?.can_access_integrations) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access integrations.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sms':
        return '📱';
      case 'email':
        return '📧';
      case 'storage':
        return '💾';
      default:
        return '🔌';
    }
  };

  const formatLastSync = (lastSync: string) => {
    return new Date(lastSync).toLocaleString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="h-6 w-6" />
            Integrations
          </h1>
          <p className="text-muted-foreground">
            Manage third-party integrations and services
          </p>
        </div>
        <Button>
          <Plug className="mr-2 h-4 w-4" />
          Add Integration
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map(integration => (
          <Card key={integration.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getTypeIcon(integration.type)}</span>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)} Service
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(integration.status)}
                  <Badge className={getStatusBadgeColor(integration.status)}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Last Sync</div>
                  <div className="text-sm">{formatLastSync(integration.last_sync)}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Configuration</div>
                  <div className="space-y-1">
                    {Object.entries(integration.config).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                        <span className="ml-1 text-muted-foreground">
                          {typeof value === 'string' && value.length > 20 
                            ? `${value.substring(0, 20)}...` 
                            : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="mr-1 h-3 w-3" />
                    Configure
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={integration.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                  >
                    {integration.status === 'active' ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {integrations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Plug className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Integrations</h3>
            <p className="text-muted-foreground mb-4">
              You haven't set up any integrations yet. Add your first integration to get started.
            </p>
            <Button>
              <Plug className="mr-2 h-4 w-4" />
              Add Your First Integration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;
