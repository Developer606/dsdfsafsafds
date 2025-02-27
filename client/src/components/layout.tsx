import { NotificationBar } from '@/components/ui/notification-bar';
import { useLocation } from 'wouter';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const showNotifications = !location.startsWith('/admin'); // Don't show on admin pages

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Anime Character Chat</h1>
          {showNotifications && <NotificationBar />}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
