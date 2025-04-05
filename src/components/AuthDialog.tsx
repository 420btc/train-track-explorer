import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { registerUser, loginUser, getCurrentUser, logoutUser, User } from '@/lib/authUtils';
import { UserCircle, LogOut, Mail, Lock, User as UserIcon } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthDialog: React.FC<AuthDialogProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Verificar si hay un usuario logueado al abrir el diálogo
    if (open) {
      const user = getCurrentUser();
      setCurrentUser(user);
    }
  }, [open]);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser(username, password)) {
      setCurrentUser(getCurrentUser());
      resetForm();
    }
  };
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (registerUser(username, password, email)) {
      setCurrentUser(getCurrentUser());
      resetForm();
    }
  };
  
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };
  
  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setConfirmPassword('');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {currentUser ? (
          // Perfil de usuario logueado
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Mi Perfil</DialogTitle>
              <DialogDescription>
                Gestiona tu cuenta y preferencias
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center py-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UserCircle className="w-12 h-12 text-primary" />
              </div>
              
              <h3 className="text-xl font-bold">{currentUser.username}</h3>
              {currentUser.email && (
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              )}
              
              <div className="text-xs text-muted-foreground mt-1">
                Miembro desde {new Date(currentUser.createdAt).toLocaleDateString()}
              </div>
              
              <div className="mt-2 text-sm">
                <span className="font-medium">{currentUser.savedRoutes.length}</span> rutas guardadas
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </>
        ) : (
          // Formularios de login/registro
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Cuenta de Usuario</DialogTitle>
              <DialogDescription>
                Inicia sesión o crea una cuenta para guardar tus rutas
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="login" value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de usuario</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                        placeholder="usuario"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">Iniciar Sesión</Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Nombre de usuario</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="reg-username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                        placeholder="usuario"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (opcional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="reg-password" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirm-password" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">Crear Cuenta</Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
