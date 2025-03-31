import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { AdvertisementManager } from '@/components/admin/advertisement-manager';
import { Crown, Palette, BarChart, Flag, MessageSquare, Megaphone, Newspaper, ShoppingBag } from 'lucide-react';

export default function AdminAdvertisements() {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Advertisement Manager</h1>
        
        <div className="flex items-center ml-auto gap-2">
          {/* Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Admin Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Link href="/admin/dashboard" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Crown className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/characters" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Palette className="h-4 w-4" />
                    Manage Characters
                  </Button>
                </Link>
                <Link href="/admin/content-moderation" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Flag className="h-4 w-4" />
                    Content Moderation
                  </Button>
                </Link>
                <Link href="/admin/dashboard/feedback" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <MessageSquare className="h-4 w-4" />
                    User Feedback
                  </Button>
                </Link>
                <Link href="/admin/dashboard/complaints" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <MessageSquare className="h-4 w-4" />
                    User Complaints
                  </Button>
                </Link>
                <Link href="/admin/advertisements" className="w-full">
                  <Button variant="default" className="w-full gap-2 justify-start">
                    <Newspaper className="h-4 w-4" />
                    Advertisements
                  </Button>
                </Link>
                <Link href="/admin/subscriptions" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <ShoppingBag className="h-4 w-4" />
                    Subscriptions
                  </Button>
                </Link>
                <Link href="/admin/broadcast" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Megaphone className="h-4 w-4" />
                    Broadcast
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="bg-background shadow-lg">
          <div className="p-6">
            <AdvertisementManager />
          </div>
        </Card>
      </div>
    </div>
  );
}