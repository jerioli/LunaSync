
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/hooks/useClinicContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';



const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { users, setCurrentUser } = useClinic();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // ✅ stop the default page reload
    try {
      const response = await fetch('http://localhost:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Login failed');
        return;
      }
  
      // Save to localStorage or context
      localStorage.setItem('user', JSON.stringify(data));
      
      toast.success(`Welcome back, ${data.name}`);
      
      navigate('/');        
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  

  

  // Quick access demo credentials
  const handleDemoLogin = (role: 'doctor' | 'receptionist' | 'admin') => {
    setIsLoading(true);
    const demoUsers = {
      doctor: users.find(u => u.role === 'doctor'),
      receptionist: users.find(u => u.role === 'receptionist'),
      admin: users.find(u => u.role === 'admin')
    };

    const user = demoUsers[role];
    if (user) {
      setTimeout(() => {
        setCurrentUser(user);
        toast.success(`Welcome, ${user.name} (Demo ${role} account)`);
        navigate('/');
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-gray relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-clinic-blue opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-clinic-teal opacity-10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-clinic-blue">MedSync</h1>
          <p className="text-gray-500">Staff Login Portal</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Please enter your details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="">Email</Label>
                <Input 
                   id="email" 
                   
                   placeholder="email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                  
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="w-full border-t pt-4 mt-2">
              <p className="text-sm text-center mb-2 text-muted-foreground">Quick access for demo</p>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleDemoLogin('doctor')}
                >
                  Doctor
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleDemoLogin('receptionist')}
                >
                  Receptionist
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleDemoLogin('admin')}
                >
                  Admin
                </Button>
              </div>
            </div>
            <div className="w-full text-center mt-4">
              <Link to="/portal" className="text-sm text-clinic-blue hover:underline">
                Return to Patient Portal
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};


export default Login;
