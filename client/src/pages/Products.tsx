import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import {
  Search, SlidersHorizontal, X, Loader2, Tag, Car,
  ArrowRight, ChevronDown, ArrowUpDown, SortAsc, SortDesc, Flame,
} from "lucide-react";
import { useState, useEffect, useMemo, useId, useRef, useCallback } from "react";
import { useSearch, useLocation } from "wouter";
import { VEHICLE_MAKES, PART_CONDITIONS } from "@shared/marketplace";

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const POPULAR = [
  "brake pads", "shock absorber", "oil filter", "timing belt",
  "spark plugs", "water pump", "clutch kit", "ball joint",
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest",         icon: SortDesc },
  { value: "popular",    label: "Most Popular",   icon: Flame },
  { value: "price_asc",  label: "Price: Low → High", icon: SortAsc },
  { value: "price_desc", label: "Price: High → Low", icon: SortDesc },
] as const;

type SortOption = typeof SORT_OPTIONS[number]["value"];

// ── Condition options ─────────────────────────────────────────────────────────
const CONDITIONS = [
  { value: "",           label: "All" },
  ...PART_CONDITIONS,
];

export default function Products() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(useSearch());

  // ── Filter state ──────────────────────────────────────────────────────────
  const [rawSearch, setRawSearch]       = useState(searchParams.get("search") || "");
  const [categoryId, setCategoryId]     = useState(
    searchParams.get("categoryId") || searchParams.get("category") || ""
  );
  const [vehicleMake, setVehicleMake]   = useState(searchParams.get("make") || "");
  const [vehicleModel, setVehicleModel] = useState("");
  const [condition, setCondition]       = useState("");
  const [minPrice, setMinPrice]         = useState("");
  const [maxPrice, setMaxPrice]         = useState("");
  const [sortBy, setSortBy]             = useState<SortOption>("newest");
  const [page, setPage]                 = useState(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeIndex, setActiveIndex]             = useState(-1);
  const [showAC, setShowAC]                       = useState(false);
  const autocompleteId                            = useId();
  const searchRef                                 = useRef<HTMLInputElement>(null);

  // ── Debounce ──────────────────────────────────────────────────────────────
  const debouncedAC     = useDebounce(rawSearch, 250);
  const debouncedSearch = useDebounce(rawSearch, 500);

  // ── SEO: dynamic title and meta description ────────────────────────────────
  useEffect(() => {
    const parts: string[] = [];
    if (debouncedSearch) parts.push(debouncedSearch);
    if (vehicleMake) parts.push(vehicleMake);
    const label = parts.length ? parts.join(" · ") + " — " : "";
    document.title = `${label}Car Parts in Ghana | VOOM Ghana`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", `Browse genuine and Tokunbo ${vehicleMake ? vehicleMake + " " : ""}spare parts from verified vendors across Ghana. Search by make, model, year, and condition on VOOM Ghana.`);
    return () => { document.title = "VOOM Ghana — Vehicle Spare Parts Marketplace"; };
  }, [debouncedSearch, vehicleMake]);

  // ── Data queries ──────────────────────────────────────────────────────────
  const categories = trpc.category.list.useQuery();
  const models     = trpc.product.models.useQuery({ make: vehicleMake }, { enabled: !!vehicleMake });
  const suggest    = trpc.product.suggest.useQuery(
    { query: debouncedAC },
    { enabled: debouncedAC.length >= 2 }
  );

  const filters = useMemo(() => ({
    search:       debouncedSearch || undefined,
    categoryId:   categoryId ? Number(categoryId) : undefined,
    vehicleMake:  vehicleMake  || undefined,
    vehicleModel: vehicleModel || undefined,
    condition:    condition    || undefined,
    minPrice:     minPrice ? Number(minPrice) : undefined,
    maxPrice:     maxPrice ? Number(maxPrice) : undefined,
    sortBy:       sortBy,
    limit:        24,
    offset:       page * 24,
  }), [debouncedSearch, categoryId, vehicleMake, vehicleModel, condition, minPrice, maxPrice, sortBy, page]);

  const results = trpc.product.search.useQuery(filters);

  // ── Autocomplete items ────────────────────────────────────────────────────
  const acItems = useMemo(() => {
    if (!suggest.data || debouncedAC.length < 2) return [];
    const seen = new Set<string>();
    return suggest.data.filter(s => {
      const k = `${s.type}:${s.label.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [suggest.data, debouncedAC]);

  const selectSuggestion = useCallback((item: { type: string; label: string }) => {
    setActiveIndex(-1);
    setShowAC(false);
    setPage(0);
    if (item.type === "make") {
      // Route vehicle makes into the dedicated make filter, not the text search
      setVehicleMake(item.label);
      setVehicleModel("");
      setRawSearch("");
    } else {
      setRawSearch(item.label);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAC || acItems.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, acItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault(); selectSuggestion(acItems[activeIndex]);
    } else if (e.key === "Escape") { setShowAC(false); setActiveIndex(-1); }
  };

  const hasActiveFilters = !!(rawSearch || categoryId || vehicleMake || vehicleModel || condition || minPrice || maxPrice);

  const clearFilters = () => {
    setRawSearch(""); setCategoryId(""); setVehicleMake("");
    setVehicleModel(""); setCondition(""); setMinPrice(""); setMaxPrice(""); setPage(0);
  };

  const didYouMean  = results.data?.suggestions ?? [];
  const noResults   = !results.isLoading && (results.data?.products.length || 0) === 0;
  const total       = results.data?.total ?? 0;
  const totalPages  = Math.ceil(total / 24);

  const activeCategoryName = categories.data?.find(c => String(c.id) === categoryId)?.name;
  const activeSortLabel    = SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? "Newest";

  // Context string above the grid
  const contextStr = results.isLoading
    ? "Searching…"
    : [
        `${total.toLocaleString()} part${total !== 1 ? "s" : ""}`,
        activeCategoryName,
        vehicleMake && vehicleModel ? `${vehicleMake} ${vehicleModel}` : vehicleMake || "",
        rawSearch ? `matching "${rawSearch}"` : "",
      ].filter(Boolean).join(" · ");

  // ── Sidebar component (shared between desktop + mobile sheet) ─────────────
  function FilterSidebar({ onApply }: { onApply?: () => void }) {
    return (
      <div className="space-y-6">

        {/* Shop by Vehicle */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3 flex items-center gap-1.5">
            <Car className="h-3 w-3" /> Shop by Vehicle
          </p>
          <div className="space-y-2">
            <Select value={vehicleMake} onValueChange={(v) => { setVehicleMake(v); setVehicleModel(""); setPage(0); }}>
              <SelectTrigger className="h-9 rounded-xl text-sm" data-testid="select-make">
                <SelectValue placeholder="Select Make" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_MAKES.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={vehicleModel}
              onValueChange={(v) => { setVehicleModel(v); setPage(0); }}
              disabled={!vehicleMake}
            >
              <SelectTrigger className="h-9 rounded-xl text-sm" data-testid="select-model">
                <SelectValue placeholder={vehicleMake ? "Select Model" : "Choose make first"} />
              </SelectTrigger>
              <SelectContent>
                {(models.data || []).map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {vehicleMake && (
            <button
              className="mt-2 text-xs text-primary/80 hover:underline"
              onClick={() => { setVehicleMake(""); setVehicleModel(""); setPage(0); }}
            >
              Clear vehicle
            </button>
          )}
        </div>

        {/* Categories */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3">
            Category
          </p>
          <div className="space-y-0.5">
            <button
              className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors tracking-wide ${
                !categoryId ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted/60"
              }`}
              onClick={() => { setCategoryId(""); setPage(0); }}
              data-testid="filter-category-all"
            >
              All Categories
            </button>
            {(categories.data || []).map(cat => (
              <button
                key={cat.id}
                className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors tracking-wide ${
                  String(cat.id) === categoryId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted/60"
                }`}
                onClick={() => { setCategoryId(String(cat.id)); setPage(0); }}
                data-testid={`filter-category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3">
            Condition
          </p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors tracking-wide ${
                  condition === c.value
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "border-border/40 text-foreground/70 hover:border-border/70"
                }`}
                onClick={() => { setCondition(c.value); setPage(0); }}
                data-testid={`filter-condition-${c.value || "all"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-3">
            Price Range (GH¢)
          </p>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPage(0); }}
              className="h-9 rounded-xl text-sm"
              data-testid="input-min-price"
            />
            <span className="text-muted-foreground/40 shrink-0">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(0); }}
              className="h-9 rounded-xl text-sm"
              data-testid="input-max-price"
            />
          </div>
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full text-xs border-border/40 gap-1.5"
            onClick={() => { clearFilters(); onApply?.(); }}
            data-testid="button-clear-all"
          >
            <X className="h-3 w-3" /> Clear All Filters
          </Button>
        )}

        {onApply && (
          <Button className="w-full rounded-full text-white" onClick={onApply} data-testid="button-apply-filters">
            Show {total > 0 ? total.toLocaleString() : ""} Results
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky search + category pill bar ─────────────────────────────── */}
      <div className="sticky top-[57px] z-30 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-border/20 shadow-sm">
        <div className="container py-3">
          <div className="flex gap-2">

            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                ref={searchRef}
                placeholder="Search by part name, brand, or model…"
                className="pl-11 h-11 rounded-[100px] bg-white/60 dark:bg-muted/30 border-border/20 text-sm tracking-wide"
                value={rawSearch}
                data-testid="input-search-products"
                role="combobox"
                aria-expanded={showAC && acItems.length > 0}
                aria-controls={autocompleteId}
                aria-activedescendant={activeIndex >= 0 ? `${autocompleteId}-${activeIndex}` : undefined}
                onChange={(e) => { setRawSearch(e.target.value); setActiveIndex(-1); setShowAC(true); setPage(0); }}
                onFocus={() => setShowAC(true)}
                onBlur={() => setTimeout(() => setShowAC(false), 150)}
                onKeyDown={handleKeyDown}
              />

              {/* Autocomplete dropdown */}
              {showAC && (
                <div
                  id={autocompleteId}
                  role="listbox"
                  className="absolute z-50 top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-border/20 overflow-hidden"
                >
                  {debouncedAC.length >= 2 && suggest.isLoading && (
                    <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding matches…
                    </div>
                  )}
                  {!suggest.isLoading && acItems.length > 0 && acItems.map((item, idx) => {
                    const Icon = item.type === "brand" ? Tag : item.type === "make" ? Car : Search;
                    const badge = item.type === "brand" ? "Brand" : item.type === "make" ? "Vehicle" : "";
                    return (
                      <button
                        key={`${item.type}-${item.label}`}
                        id={`${autocompleteId}-${idx}`}
                        role="option"
                        aria-selected={idx === activeIndex}
                        className={`w-full text-left px-4 py-2.5 text-sm tracking-wide flex items-center gap-3 transition-colors ${
                          idx === activeIndex ? "bg-primary/10" : "hover:bg-muted/40"
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                        data-testid={`suggest-${item.type}-${idx}`}
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge && (
                          <span className="text-[10px] tracking-widest uppercase text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {debouncedAC.length < 2 && (
                    <div className="p-3">
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 px-2 pb-2">Popular searches</p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR.map(term => (
                          <button
                            key={term}
                            className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/10 text-foreground/80 tracking-wide transition-colors"
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion({ type: "product", label: term }); }}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile: filter + sort buttons */}
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-full border-border/20 text-sm lg:hidden"
              onClick={() => setShowMobileFilters(true)}
              data-testid="button-mobile-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                  !
                </span>
              )}
              Filters
            </Button>
          </div>

          {/* Category pills — always visible */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-2.5 pb-0.5">
            <button
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-all tracking-wide whitespace-nowrap ${
                !categoryId ? "bg-primary text-white border-primary" : "border-border/30 text-foreground/70 hover:border-border"
              }`}
              onClick={() => { setCategoryId(""); setPage(0); }}
              data-testid="pill-category-all"
            >
              All Parts
            </button>
            {(categories.data || []).map(cat => (
              <button
                key={cat.id}
                className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border transition-all tracking-wide whitespace-nowrap ${
                  String(cat.id) === categoryId
                    ? "bg-primary text-white border-primary"
                    : "border-border/30 text-foreground/70 hover:border-border"
                }`}
                onClick={() => { setCategoryId(String(cat.id)); setPage(0); }}
                data-testid={`pill-category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main layout: sidebar + results ────────────────────────────────── */}
      <div className="container py-6">
        <div className="flex gap-7">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="sticky top-[144px] space-y-6 pb-10">
              <FilterSidebar />
            </div>
          </aside>

          {/* Results column */}
          <main className="flex-1 min-w-0">

            {/* Results header row */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground tracking-wide truncate" data-testid="text-results-count">
                  {contextStr}
                </p>
                {/* Active filter chips */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {rawSearch && <FilterChip label={`"${rawSearch}"`} onRemove={() => setRawSearch("")} />}
                    {categoryId && <FilterChip label={activeCategoryName || "Category"} onRemove={() => setCategoryId("")} />}
                    {vehicleMake && <FilterChip label={vehicleMake} onRemove={() => { setVehicleMake(""); setVehicleModel(""); }} />}
                    {vehicleModel && <FilterChip label={vehicleModel} onRemove={() => setVehicleModel("")} />}
                    {condition && <FilterChip label={condition} onRemove={() => setCondition("")} />}
                    {(minPrice || maxPrice) && (
                      <FilterChip
                        label={`GH¢ ${minPrice || "0"} – ${maxPrice || "∞"}`}
                        onRemove={() => { setMinPrice(""); setMaxPrice(""); }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="shrink-0">
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setPage(0); }}>
                  <SelectTrigger
                    className="h-9 gap-2 rounded-full border-border/30 text-xs w-auto pl-3 pr-3 min-w-[140px]"
                    data-testid="select-sort"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading */}
            {results.isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!results.isLoading && results.error && (
              <Card className="border-dashed border-border/30 rounded-3xl">
                <CardContent className="py-20 text-center">
                  <Search className="h-10 w-10 mx-auto mb-5 text-destructive/40" />
                  <h3 className="font-light text-lg mb-3 tracking-wide">Search failed</h3>
                  <p className="text-muted-foreground text-sm mb-5 tracking-wide">{results.error.message}</p>
                  <Button variant="outline" className="rounded-full" onClick={() => results.refetch()}>Try Again</Button>
                </CardContent>
              </Card>
            )}

            {/* Results grid */}
            {!results.isLoading && !results.error && !noResults && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.data?.products.map(product => (
                    <ProductCard key={product.id} product={product} vendorWhatsapp={product.vendorWhatsapp ?? undefined} vendorName={product.vendorName} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 mt-10 pt-8 border-t border-border/20">
                    <p className="text-xs text-muted-foreground tracking-wide">
                      Showing {(page * 24) + 1}–{Math.min((page + 1) * 24, total)} of {total.toLocaleString()} parts
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-border/30 h-8 px-4 text-xs"
                        disabled={page === 0}
                        onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        data-testid="button-prev-page"
                      >
                        ← Prev
                      </Button>
                      {/* Page pills — show up to 5 */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                          return (
                            <button
                              key={pageNum}
                              className={`w-8 h-8 rounded-full text-xs transition-colors ${
                                pageNum === page
                                  ? "bg-primary text-white"
                                  : "text-muted-foreground hover:bg-muted/60"
                              }`}
                              onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              data-testid={`button-page-${pageNum + 1}`}
                            >
                              {pageNum + 1}
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-border/30 h-8 px-4 text-xs"
                        disabled={(page + 1) * 24 >= total}
                        onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        data-testid="button-next-page"
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!results.isLoading && !results.error && noResults && (
              <Card className="border-dashed border-border/20 rounded-3xl">
                <CardContent className="py-20 text-center max-w-lg mx-auto">
                  <Search className="h-10 w-10 mx-auto mb-5 text-muted-foreground/40" />
                  <h3 className="font-light text-lg mb-2 tracking-wide">No parts found</h3>
                  <p className="text-muted-foreground text-sm mb-6 tracking-wide">
                    {rawSearch
                      ? `Nothing matched "${rawSearch}". Try a different search or browse by category.`
                      : "Try adjusting your filters."}
                  </p>

                  {didYouMean.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Did you mean?</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {didYouMean.map(s => (
                          <button
                            key={s}
                            className="text-sm px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary tracking-wide transition-colors flex items-center gap-1.5"
                            onClick={() => { setRawSearch(s); setPage(0); }}
                            data-testid={`did-you-mean-${s}`}
                          >
                            <ArrowRight className="h-3 w-3" /> {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">Popular searches</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {POPULAR.map(term => (
                        <button
                          key={term}
                          className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground/80 tracking-wide transition-colors"
                          onClick={() => { setRawSearch(term); setPage(0); }}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-6 rounded-full border-border/30" onClick={clearFilters}>
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* ── Mobile filter sheet ────────────────────────────────────────────── */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMobileFilters(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-[min(340px,90vw)] bg-background shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border/20">
              <h2 className="font-medium tracking-wide">Filters</h2>
              <button
                className="p-2 rounded-full hover:bg-muted/60 transition-colors"
                onClick={() => setShowMobileFilters(false)}
                data-testid="button-close-mobile-filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <FilterSidebar onApply={() => setShowMobileFilters(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary/90 text-xs font-medium px-2.5 py-1 rounded-full tracking-wide">
      {label}
      <button onClick={onRemove} className="hover:bg-primary/20 rounded-full p-0.5 ml-0.5" data-testid="button-remove-filter">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
