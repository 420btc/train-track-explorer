
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const UserProfile: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:block">
        <Card className="bg-primary-foreground border-0">
          <CardContent className="p-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://i.pravatar.cc/100" alt="Usuario" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">Usuario</div>
                <div className="text-xs text-muted-foreground">Nivel: Conductor</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="md:hidden">
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://i.pravatar.cc/100" alt="Usuario" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};

export default UserProfile;
