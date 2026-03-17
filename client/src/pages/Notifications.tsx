import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Bell, Check, Loader2 } from "lucide-react";

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const notifications = trpc.notification.list.useQuery(undefined, { enabled: isAuthenticated });
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => utils.notification.list.invalidate(),
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <Bell className="h-12 w-12 mx-auto mb-6 text-muted-foreground/30" />
        <h2 className="text-xl font-light tracking-wide mb-2">Sign in to view notifications</h2>
      </div>
    );
  }

  const items = notifications.data || [];
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-white/60">
      <div className="container py-10 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-light tracking-wide">Notifications</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="tracking-wide rounded-full" onClick={() => markAllRead.mutate()}>
              <Check className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 ${!n.read ? "bg-primary/3 border-primary/10" : ""}`}
                onClick={() => { if (!n.read) markRead.mutate({ id: n.id }); }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? "bg-primary/70" : "bg-transparent"}`} />
                    <div className="flex-1">
                      <h3 className="font-medium tracking-wide text-sm">{n.title}</h3>
                      <p className="text-sm text-muted-foreground/70 mt-1 tracking-wide">{n.message}</p>
                      <p className="text-xs text-muted-foreground/50 mt-2 tracking-wide">
                        {new Date(n.createdAt).toLocaleDateString("en-GH", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {n.link && (
                      <Link href={n.link}>
                        <Button variant="ghost" size="sm" className="rounded-full tracking-wide">View</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-white/20 rounded-3xl bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
            <CardContent className="py-20 text-center">
              <Bell className="h-10 w-10 mx-auto mb-6 text-muted-foreground/30" />
              <h3 className="font-light tracking-wide text-lg mb-3">No notifications</h3>
              <p className="text-muted-foreground/70 text-sm tracking-wide">You're all caught up!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
