import { trpc } from "@/lib/trpc";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import CategoryOrb from "@/components/CategoryOrb";
import { Link } from "wouter";
import { useEffect } from "react";

export default function Categories() {
  const categories = trpc.category.list.useQuery();

  useEffect(() => {
    document.title = "Browse Auto Parts by Category | VOOM Ghana";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Explore vehicle spare parts by category on VOOM Ghana. Engine & drivetrain, brakes, suspension, electrical, body panels, and more — all from verified dealers across Ghana.");
    return () => { document.title = "VOOM Ghana — Vehicle Spare Parts Marketplace"; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-white/60">
      <div className="zen-hero py-14">
        <div className="container">
          <h1 className="text-3xl font-light tracking-wide text-white">Browse by Category</h1>
          <p className="text-white/50 mt-3 tracking-wide">Find parts organized by vehicle system</p>
        </div>
      </div>

      <div className="container py-10">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground/70 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Categories</span>
        </nav>

        {categories.isLoading ? (
          <div className="flex overflow-x-hidden gap-10 py-10 pl-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0">
                <Skeleton className="w-[120px] h-[120px] rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        ) : categories.error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive/60" />
            <h3 className="font-medium text-lg">Failed to load categories</h3>
            <p className="text-sm text-muted-foreground">{categories.error.message}</p>
            <Button variant="outline" onClick={() => categories.refetch()} className="rounded-full">
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
              {/* Right-edge fade hint */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-50/90 to-transparent pointer-events-none z-10" />
              <div className="flex overflow-x-auto scrollbar-hide gap-8 py-8 pl-4 sm:pl-6 lg:pl-8 pr-16">
                {(categories.data || []).map((cat) => (
                  <CategoryOrb key={cat.id} id={cat.id} name={cat.name} slug={cat.slug} icon={cat.icon} />
                ))}
              </div>
            </div>
            {/* Swipe indicator */}
            <div className="flex justify-center mt-2 mb-1">
              <div className="swipe-hint">
                <div className="swipe-hint-icon">
                  <ChevronRight className="w-3 h-3" />
                </div>
                <span>swipe to explore</span>
                <div className="swipe-hint-icon">
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
