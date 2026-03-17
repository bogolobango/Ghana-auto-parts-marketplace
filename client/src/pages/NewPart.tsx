import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatGHS, VEHICLE_MAKES, PART_CONDITIONS } from "@shared/marketplace";
import {
  ArrowLeft, ArrowRight, Camera, CheckCircle2, ChevronRight,
  ImageIcon, Loader2, Package, Sparkles, Star, Trash2,
  Upload, X, ZapIcon, AlertCircle, MapPin,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type UploadedImage = {
  localUrl: string;
  remoteUrl: string | null;
  uploading: boolean;
  error: boolean;
  file: File;
};

type FormState = {
  name: string;
  description: string;
  brand: string;
  sku: string;
  condition: "new" | "used" | "refurbished";
  categoryId: string;
  price: string;
  quantity: string;
  status: "active" | "inactive";
  vehicleMake: string;
  vehicleModel: string;
  yearFrom: string;
  yearTo: string;
};

const BLANK: FormState = {
  name: "", description: "", brand: "", sku: "",
  condition: "new", categoryId: "", price: "", quantity: "1",
  status: "active", vehicleMake: "", vehicleModel: "", yearFrom: "", yearTo: "",
};

const STEPS = ["Photos", "Details", "Pricing", "Compatibility", "Review"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);

// Smart category keyword map
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Brakes, Suspension & Steering": ["brake", "pad", "disc", "rotor", "caliper", "shock", "strut", "suspension", "steering", "rack", "pinion", "tie rod", "ball joint", "cv joint", "axle"],
  "Engine & Drivetrain": ["engine", "motor", "piston", "crankshaft", "camshaft", "timing", "belt", "chain", "head gasket", "valve", "oil pump", "transmission", "gearbox", "clutch", "flywheel", "differential"],
  "Electrical & Electronics": ["battery", "alternator", "starter", "sensor", "ecu", "module", "relay", "fuse", "wiring", "switch", "ignition", "coil", "spark plug"],
  "Filters & Fluids": ["filter", "air filter", "oil filter", "fuel filter", "cabin filter", "fluid", "coolant", "antifreeze"],
  "Headlights & Lighting": ["headlight", "taillight", "bulb", "lamp", "led", "light", "indicator", "fog"],
  "Exterior & Body Parts": ["bumper", "hood", "bonnet", "fender", "door", "mirror", "handle", "grille", "spoiler", "panel", "wing"],
  "Cooling System": ["radiator", "cooling", "thermostat", "water pump", "fan", "hose", "coolant"],
  "Audio & Entertainment": ["speaker", "radio", "audio", "stereo", "amplifier", "subwoofer", "GPS", "camera", "tracker"],
  "Interior & Accessories": ["seat", "dashboard", "steering wheel", "carpet", "mat", "cover", "interior", "mirror", "wiper"],
  "Safety & Security": ["airbag", "seatbelt", "alarm", "lock", "immobiliser", "tyre", "tire", "rim", "wheel"],
};

// ── Listing strength calculator ───────────────────────────────────────────────

function useListingStrength(form: FormState, images: UploadedImage[]) {
  return useMemo(() => {
    const uploadedImages = images.filter(i => i.remoteUrl);
    const scores: { label: string; pts: number; earned: number }[] = [
      { label: "Photos",       pts: 25, earned: Math.min(uploadedImages.length * 5, 25) },
      { label: "Name",         pts: 15, earned: form.name.length >= 5 ? 15 : form.name.length >= 2 ? 7 : 0 },
      { label: "Description",  pts: 15, earned: form.description.length >= 80 ? 15 : form.description.length >= 30 ? 8 : 0 },
      { label: "Category",     pts: 10, earned: form.categoryId ? 10 : 0 },
      { label: "Price",        pts: 15, earned: parseFloat(form.price) > 0 ? 15 : 0 },
      { label: "Brand",        pts: 5,  earned: form.brand.length >= 2 ? 5 : 0 },
      { label: "Vehicle fit",  pts: 15, earned: form.vehicleMake ? (form.vehicleModel ? 15 : 8) : 0 },
    ];
    const total = scores.reduce((s, c) => s + c.pts, 0);
    const earned = scores.reduce((s, c) => s + c.earned, 0);
    return { scores, total, earned, pct: Math.round((earned / total) * 100) };
  }, [form, images]);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NewPart() {
  const { id } = useParams<{ id?: string }>();
  const editId = id ? Number(id) : null;
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const vendor     = trpc.vendor.me.useQuery(undefined, { enabled: isAuthenticated });
  const categories = trpc.category.list.useQuery();
  const utils      = trpc.useUtils();

  const [step,   setStep]   = useState<Step>(0);
  const [form,   setForm]   = useState<FormState>(BLANK);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const uploadImageMut  = trpc.upload.image.useMutation();

  const modelsQuery = trpc.product.models.useQuery(
    { make: form.vehicleMake },
    { enabled: !!form.vehicleMake, staleTime: 60_000 }
  );

  // Load existing product for edit mode
  const editProduct = trpc.product.getById.useQuery(
    { id: editId! },
    { enabled: !!editId, staleTime: 0 }
  );

  useEffect(() => {
    if (editProduct.data && editId) {
      const p = editProduct.data as any;
      setForm({
        name: p.name ?? "", description: p.description ?? "",
        brand: p.brand ?? "", sku: p.sku ?? "",
        condition: p.condition ?? "new",
        categoryId: p.categoryId ? String(p.categoryId) : "",
        price: String(p.price ?? ""), quantity: String(p.quantity ?? 1),
        status: p.status === "inactive" ? "inactive" : "active",
        vehicleMake: p.vehicleMake ?? "", vehicleModel: p.vehicleModel ?? "",
        yearFrom: p.yearFrom ? String(p.yearFrom) : "",
        yearTo: p.yearTo ? String(p.yearTo) : "",
      });
      const imgs = (p.images as string[] | null) ?? [];
      setImages(imgs.map(url => ({ localUrl: url, remoteUrl: url, uploading: false, error: false, file: new File([], "") })));
    }
  }, [editProduct.data, editId]);

  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => { utils.product.myProducts.invalidate(); toast.success("Part listed successfully!"); navigate("/vendor/dashboard"); },
    onError: (e) => toast.error(e.message),
  });
  const updateProduct = trpc.product.update.useMutation({
    onSuccess: () => { utils.product.myProducts.invalidate(); toast.success("Listing updated!"); navigate("/vendor/dashboard"); },
    onError: (e) => toast.error(e.message),
  });

  const strength = useListingStrength(form, images);

  // Smart category suggestion
  useEffect(() => {
    if (form.categoryId || !form.name) return;
    const lower = form.name.toLowerCase();
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        const cat = (categories.data || []).find(c => c.name === catName);
        if (cat) setForm(f => ({ ...f, categoryId: String(cat.id) }));
        break;
      }
    }
  }, [form.name, form.categoryId, categories.data]);

  // Image upload
  const uploadFile = useCallback(async (file: File): Promise<void> => {
    const localUrl = URL.createObjectURL(file);
    const placeholder: UploadedImage = { localUrl, remoteUrl: null, uploading: true, error: false, file };
    setImages(prev => [...prev, placeholder]);

    try {
      const b64 = await fileToBase64(file);
      const res = await uploadImageMut.mutateAsync({ data: b64, filename: file.name, contentType: file.type });
      setImages(prev => prev.map(img => img.localUrl === localUrl ? { ...img, remoteUrl: res.url, uploading: false } : img));
    } catch {
      setImages(prev => prev.map(img => img.localUrl === localUrl ? { ...img, uploading: false, error: true } : img));
    }
  }, [uploadImageMut]);

  const addFiles = useCallback((files: File[]) => {
    const ready = images.filter(i => !i.error);
    const remaining = 6 - ready.length;
    if (remaining <= 0) { toast.error("Maximum 6 images"); return; }
    files.slice(0, remaining).forEach(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return; }
      if (f.size > 8 * 1024 * 1024)    { toast.error(`${f.name} exceeds 8MB`);      return; }
      uploadFile(f);
    });
  }, [images, uploadFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages(prev => { URL.revokeObjectURL(prev[idx].localUrl); return prev.filter((_, i) => i !== idx); });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = () => {
    if (!form.name) { toast.error("Part name is required"); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error("Please enter a valid price"); return; }
    const uploadedUrls = images.filter(i => i.remoteUrl).map(i => i.remoteUrl!);
    const payload = {
      name: form.name, description: form.description || undefined,
      brand: form.brand || undefined, sku: form.sku || undefined,
      condition: form.condition,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      price: form.price, quantity: Number(form.quantity) || 1,
      status: form.status,
      vehicleMake: (form.vehicleMake || undefined) as any,
      vehicleModel: form.vehicleModel || undefined,
      yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
      yearTo: form.yearTo ? Number(form.yearTo) : undefined,
      images: uploadedUrls.length ? uploadedUrls : undefined,
    };
    if (editId) updateProduct.mutate({ id: editId, ...payload });
    else createProduct.mutate(payload);
  };

  const f = (k: keyof FormState) => (val: string) => setForm(p => ({ ...p, [k]: val }));
  const busy = createProduct.isPending || updateProduct.isPending;
  const canProceed = [
    true, // step 0: photos — optional but encouraged
    form.name.length >= 2, // step 1: need a name
    parseFloat(form.price) > 0, // step 2: need a price
    true, // step 3: compat optional
    true, // step 4: review
  ];

  if (!isAuthenticated || vendor.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/70" /></div>;
  }
  if (!vendor.data || vendor.data.status !== "approved") {
    return <div className="container py-24 text-center"><p className="text-muted-foreground">Vendor account required.</p></div>;
  }

  const uploadedCount  = images.filter(i => i.remoteUrl).length;
  const uploadingCount = images.filter(i => i.uploading).length;
  const categoryName   = (categories.data || []).find(c => String(c.id) === form.categoryId)?.name;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top nav ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/20">
        <div className="container max-w-5xl px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground" onClick={() => navigate("/vendor/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-medium tracking-wide">{editId ? "Edit Listing" : "List a New Part"}</h1>
            <p className="text-[11px] text-muted-foreground tracking-wide">{STEPS[step]}</p>
          </div>
          {/* Step dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => i <= step || canProceed[step] ? setStep(i as Step) : null} className="flex items-center gap-1 text-[11px] tracking-wide group">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${i === step ? "bg-primary text-white" : i < step ? "bg-primary/20 text-primary" : "bg-border/50 text-muted-foreground/50"}`}>
                  {i < step ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                </span>
                <span className={`${i === step ? "text-foreground" : "text-muted-foreground/40"} hidden md:block`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-border/60 hidden md:block" />}
              </button>
            ))}
          </div>
          {/* Mobile step indicator */}
          <span className="sm:hidden text-[11px] text-muted-foreground">{step + 1}/{STEPS.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-border/20">
          <div className="h-full bg-primary/70 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="container max-w-5xl px-4 py-8">
        <div className="flex gap-8">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* ════ Step 0: Photos ════ */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-light tracking-wide mb-1">Add photos</h2>
                  <p className="text-sm text-muted-foreground tracking-wide">Great photos increase sales by 3×. The first photo is the cover buyers see.</p>
                </div>

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${dragOver ? "border-primary/60 bg-primary/5" : "border-border/40 hover:border-primary/30 hover:bg-primary/3"} ${images.length >= 6 ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary/60" />
                    </div>
                    <div>
                      <p className="font-medium tracking-wide text-sm">Drop photos here or tap to upload</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG or WEBP · Max 8MB each · Up to 6 photos</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
                </div>

                {/* Camera shortcut (mobile) */}
                <div className="sm:hidden">
                  <Button variant="outline" className="w-full rounded-2xl border-border/30 gap-2" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="h-4 w-4" /> Take a Photo
                  </Button>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                </div>

                {/* Image grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border/30 group bg-muted/30">
                        <img src={img.localUrl} alt="" className={`w-full h-full object-cover transition-opacity ${img.uploading ? "opacity-40" : ""}`} />

                        {/* Uploading overlay */}
                        {img.uploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm gap-1">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                            <span className="text-[10px] text-white/80">Uploading…</span>
                          </div>
                        )}

                        {/* Error overlay */}
                        {img.error && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/80 gap-1">
                            <AlertCircle className="h-5 w-5 text-white" />
                            <span className="text-[10px] text-white">Failed</span>
                          </div>
                        )}

                        {/* Success checkmark */}
                        {img.remoteUrl && !img.error && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}

                        {/* Cover badge */}
                        {idx === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-primary/85 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Cover</span>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}

                    {/* Add more slot */}
                    {images.length < 6 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/30 flex flex-col items-center justify-center gap-1.5 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">Add more</span>
                      </button>
                    )}
                  </div>
                )}

                {uploadingCount > 0 && (
                  <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading {uploadingCount} photo{uploadingCount !== 1 ? "s" : ""}…
                  </p>
                )}

                {images.length === 0 && (
                  <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200/60">
                    <ZapIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 tracking-wide">Photos boost your visibility</p>
                      <p className="text-[11px] text-amber-700/70 mt-0.5">Listings with 3+ clear photos get 3× more WhatsApp enquiries. You can skip this and add photos later.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════ Step 1: Details ════ */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-light tracking-wide mb-1">Part details</h2>
                  <p className="text-sm text-muted-foreground tracking-wide">Be specific. Buyers search by name, brand, and part number.</p>
                </div>

                <div className="space-y-5">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-wide text-muted-foreground">Part Name *</Label>
                    <Input
                      value={form.name}
                      onChange={e => f("name")(e.target.value)}
                      placeholder="e.g. Front Brake Pads Set — Toyota Camry 2015–2022"
                      className="rounded-2xl border-border/30 h-12 text-sm"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground/60">Include the vehicle name and years for maximum discoverability.</p>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-wide text-muted-foreground">Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={e => f("description")(e.target.value)}
                      placeholder="Include OEM/part number, fitment notes, condition details, what's included in the box…"
                      rows={4}
                      className="rounded-2xl border-border/30 resize-none text-sm"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-muted-foreground/60">More detail → fewer back-and-forth questions → more sales.</p>
                      <span className={`text-[11px] ${form.description.length >= 80 ? "text-emerald-600" : "text-muted-foreground/40"}`}>{form.description.length}/80</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Brand */}
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-wide text-muted-foreground">Brand / Manufacturer</Label>
                      <Input value={form.brand} onChange={e => f("brand")(e.target.value)} placeholder="e.g. Bosch, Denso, OEM" className="rounded-2xl border-border/30" />
                    </div>
                    {/* SKU */}
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-wide text-muted-foreground">OEM / Part Number</Label>
                      <Input value={form.sku} onChange={e => f("sku")(e.target.value)} placeholder="e.g. 04465-06210" className="rounded-2xl border-border/30" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-wide text-muted-foreground flex items-center gap-1.5">
                        Category
                        {form.categoryId && form.name && (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />Auto-detected</span>
                        )}
                      </Label>
                      <Select value={form.categoryId} onValueChange={f("categoryId")}>
                        <SelectTrigger className="rounded-2xl border-border/30"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {(categories.data || []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Condition */}
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-wide text-muted-foreground">Condition</Label>
                      <div className="flex gap-2">
                        {PART_CONDITIONS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => f("condition")(c.value)}
                            className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-medium tracking-wide transition-all ${form.condition === c.value ? "bg-primary/10 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:border-primary/20"}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ Step 2: Pricing & Stock ════ */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-light tracking-wide mb-1">Pricing & stock</h2>
                  <p className="text-sm text-muted-foreground tracking-wide">Set a competitive price. You can always update this later.</p>
                </div>

                <div className="space-y-5">
                  {/* Price — prominent */}
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-wide text-muted-foreground">Selling Price (GH₵) *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-medium text-sm">GH₵</span>
                      <Input
                        value={form.price}
                        onChange={e => f("price")(e.target.value)}
                        type="number" step="0.01" min="0"
                        placeholder="0.00"
                        className="rounded-2xl border-border/30 h-14 pl-14 text-lg font-light"
                        autoFocus
                      />
                    </div>
                    {parseFloat(form.price) > 0 && (
                      <p className="text-xs text-muted-foreground/60">Buyers will see: <span className="text-primary font-medium">{formatGHS(form.price)}</span></p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-wide text-muted-foreground">Quantity in Stock</Label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => f("quantity")(String(Math.max(0, parseInt(form.quantity || "0") - 1)))} className="w-10 h-10 rounded-2xl border border-border/30 flex items-center justify-center text-muted-foreground hover:border-primary/30 transition-colors text-lg font-light">−</button>
                      <Input value={form.quantity} onChange={e => f("quantity")(e.target.value)} type="number" min="0" className="rounded-2xl border-border/30 text-center w-24 h-10 text-sm" />
                      <button type="button" onClick={() => f("quantity")(String(parseInt(form.quantity || "0") + 1))} className="w-10 h-10 rounded-2xl border border-border/30 flex items-center justify-center text-muted-foreground hover:border-primary/30 transition-colors text-lg font-light">+</button>
                      <span className="text-xs text-muted-foreground/60">units available</span>
                    </div>
                    {parseInt(form.quantity) === 0 && <p className="text-xs text-amber-600">⚠ Setting 0 marks this as out of stock</p>}
                  </div>

                  {/* Visibility */}
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wide text-muted-foreground">Visibility</Label>
                    <div className="flex gap-3">
                      {[{ v: "active", label: "Active — visible to buyers", dot: "bg-emerald-500" }, { v: "inactive", label: "Draft — hidden from buyers", dot: "bg-muted-foreground/30" }].map(({ v, label, dot }) => (
                        <button key={v} type="button" onClick={() => f("status")(v)} className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-2xl border text-sm transition-all text-left ${form.status === v ? "border-primary/40 bg-primary/5" : "border-border/30 hover:border-primary/20"}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                          <span className="text-xs tracking-wide">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ Step 3: Compatibility ════ */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-light tracking-wide mb-1">Vehicle compatibility</h2>
                  <p className="text-sm text-muted-foreground tracking-wide">Help buyers find this part using vehicle-specific search. Tag which car(s) it fits.</p>
                </div>

                <div className="space-y-5">
                  {/* Make */}
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-wide text-muted-foreground">Vehicle Make</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {VEHICLE_MAKES.map(make => (
                        <button
                          key={make}
                          type="button"
                          onClick={() => { f("vehicleMake")(form.vehicleMake === make ? "" : make); f("vehicleModel")(""); }}
                          className={`py-2.5 px-3 rounded-2xl border text-xs font-medium tracking-wide transition-all ${form.vehicleMake === make ? "bg-primary/10 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:border-primary/20"}`}
                        >
                          {make}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model — dynamic */}
                  {form.vehicleMake && (
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-wide text-muted-foreground">Model</Label>
                      {modelsQuery.isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading models…
                        </div>
                      ) : (modelsQuery.data?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {modelsQuery.data?.map(m => (
                            <button key={m} type="button" onClick={() => f("vehicleModel")(form.vehicleModel === m ? "" : m)}
                              className={`py-1.5 px-3 rounded-full border text-xs tracking-wide transition-all ${form.vehicleModel === m ? "bg-primary/10 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:border-primary/20"}`}>
                              {m}
                            </button>
                          ))}
                          <Input value={form.vehicleModel} onChange={e => f("vehicleModel")(e.target.value)} placeholder="Or type a model…" className="rounded-full border-border/30 h-8 text-xs px-4 w-40" />
                        </div>
                      ) : (
                        <Input value={form.vehicleModel} onChange={e => f("vehicleModel")(e.target.value)} placeholder="e.g. Camry, Corolla, Hilux" className="rounded-2xl border-border/30" />
                      )}
                    </div>
                  )}

                  {/* Year range */}
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-wide text-muted-foreground">Year Range</Label>
                    <div className="flex items-center gap-3">
                      <Select value={form.yearFrom} onValueChange={v => { f("yearFrom")(v); if (form.yearTo && Number(form.yearTo) < Number(v)) f("yearTo")(v); }}>
                        <SelectTrigger className="rounded-2xl border-border/30 w-32"><SelectValue placeholder="From" /></SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-56">
                          {YEAR_OPTIONS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground/50 text-sm">to</span>
                      <Select value={form.yearTo} onValueChange={f("yearTo")}>
                        <SelectTrigger className="rounded-2xl border-border/30 w-32"><SelectValue placeholder="To" /></SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-56">
                          {YEAR_OPTIONS.filter(y => !form.yearFrom || y >= Number(form.yearFrom)).map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.yearFrom && form.yearTo && <p className="text-xs text-muted-foreground/60">Fits {form.vehicleMake || "vehicles"} from <strong>{form.yearFrom}</strong> to <strong>{form.yearTo}</strong></p>}
                  </div>

                  {!form.vehicleMake && (
                    <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-blue-50 border border-blue-200/60">
                      <ZapIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700 leading-relaxed">Tagging a vehicle make increases your listing's discoverability by 2×. Buyers frequently filter by make and model.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════ Step 4: Review ════ */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-light tracking-wide mb-1">Review & publish</h2>
                  <p className="text-sm text-muted-foreground tracking-wide">Check everything looks right before going live.</p>
                </div>

                {/* Summary card */}
                <div className="rounded-3xl border border-border/25 bg-white/60 backdrop-blur-xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
                  {/* Cover image */}
                  <div className="aspect-video bg-muted/20 relative overflow-hidden">
                    {images.find(i => i.remoteUrl) ? (
                      <img src={images.find(i => i.remoteUrl)!.remoteUrl!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/15" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-background/85 backdrop-blur-sm text-foreground/80 border border-white/40 text-[10px]">
                        {PART_CONDITIONS.find(c => c.value === form.condition)?.label ?? "New"}
                      </Badge>
                      {uploadedCount > 1 && <Badge className="bg-background/85 backdrop-blur-sm text-foreground/80 border border-white/40 text-[10px]">{uploadedCount} photos</Badge>}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-medium text-base tracking-wide">{form.name || <span className="text-muted-foreground/40 italic">Part name here</span>}</h3>
                      {form.brand && <p className="text-xs text-muted-foreground mt-0.5">{form.brand}{form.sku ? ` · ${form.sku}` : ""}</p>}
                    </div>

                    <p className="text-2xl font-light text-primary tracking-wide">{parseFloat(form.price) > 0 ? formatGHS(form.price) : <span className="text-muted-foreground/40 text-base italic">Price not set</span>}</p>

                    {categoryName && <Badge variant="secondary" className="text-[10px] rounded-full">{categoryName}</Badge>}

                    {form.vehicleMake && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Fits {form.vehicleMake}{form.vehicleModel ? ` ${form.vehicleModel}` : ""}{form.yearFrom ? ` (${form.yearFrom}${form.yearTo && form.yearTo !== form.yearFrom ? `–${form.yearTo}` : ""})` : ""}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{vendor.data?.city || "Ghana"} · {vendor.data?.businessName}</span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                <div className="space-y-2">
                  {uploadedCount === 0 && <WarnRow>No photos — listings without photos get 80% fewer clicks</WarnRow>}
                  {!form.description && <WarnRow>No description — helps buyers decide faster</WarnRow>}
                  {!form.vehicleMake && <WarnRow>No vehicle tag — buyers can't find this via make/model filter</WarnRow>}
                </div>
              </div>
            )}

            {/* ── Step nav ── */}
            <div className="flex items-center justify-between pt-8 mt-8 border-t border-border/20">
              <Button variant="ghost" className="rounded-full text-muted-foreground gap-2" onClick={() => step > 0 ? setStep((step - 1) as Step) : navigate("/vendor/dashboard")} disabled={busy}>
                <ArrowLeft className="h-4 w-4" />
                {step === 0 ? "Cancel" : "Back"}
              </Button>

              {step < 4 ? (
                <Button className="rounded-full text-white gap-2 px-8" onClick={() => setStep((step + 1) as Step)}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="rounded-full text-white gap-2 px-10 h-12" onClick={handleSubmit} disabled={busy || !form.name || !form.price}>
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{editId ? "Saving…" : "Publishing…"}</> : (editId ? "Save Changes" : "Publish Listing")}
                </Button>
              )}
            </div>
          </div>

          {/* ── Desktop sidebar: Strength meter + preview ── */}
          <div className="hidden lg:block w-72 flex-shrink-0 space-y-5 sticky top-24 self-start">
            {/* Strength meter */}
            <div className="rounded-2xl border border-border/20 bg-white/60 backdrop-blur-xl p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">Listing Strength</p>
                <span className={`text-sm font-medium ${strength.pct >= 80 ? "text-emerald-600" : strength.pct >= 50 ? "text-amber-600" : "text-muted-foreground/60"}`}>{strength.pct}%</span>
              </div>

              {/* Bar */}
              <div className="h-2 bg-border/25 rounded-full overflow-hidden mb-4">
                <div className={`h-full rounded-full transition-all duration-700 ${strength.pct >= 80 ? "bg-emerald-500" : strength.pct >= 50 ? "bg-amber-400" : "bg-primary/50"}`} style={{ width: `${strength.pct}%` }} />
              </div>

              {/* Score rows */}
              <div className="space-y-2">
                {strength.scores.map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.earned >= s.pts ? "bg-emerald-500" : s.earned > 0 ? "bg-amber-400" : "bg-border/50"}`} />
                    <span className="text-[11px] text-muted-foreground flex-1 tracking-wide">{s.label}</span>
                    <span className={`text-[10px] font-medium ${s.earned >= s.pts ? "text-emerald-600" : s.earned > 0 ? "text-amber-600" : "text-muted-foreground/30"}`}>{s.earned}/{s.pts}</span>
                  </div>
                ))}
              </div>

              {strength.pct >= 80 && (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                  <Star className="h-3 w-3 fill-emerald-500 text-emerald-500 flex-shrink-0" />
                  Great listing! This should rank well.
                </div>
              )}
            </div>

            {/* Mini preview */}
            {(form.name || form.price || images.length > 0) && (
              <div className="rounded-2xl border border-border/20 bg-white/60 backdrop-blur-xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)]">
                <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase px-4 pt-3 pb-2">Live Preview</p>
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  {images.find(i => i.remoteUrl) ? (
                    <img src={images.find(i => i.remoteUrl)!.remoteUrl!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/15" />
                    </div>
                  )}
                  {uploadedCount > 0 && <span className="absolute bottom-2 right-2 bg-black/45 text-white text-[10px] rounded-full px-2 py-0.5">{uploadedCount} photos</span>}
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-medium leading-snug line-clamp-2">{form.name || <span className="text-muted-foreground/30 italic">Part name…</span>}</p>
                  {form.brand && <p className="text-[10px] text-muted-foreground/60">{form.brand}</p>}
                  <p className="text-sm font-medium text-primary">{parseFloat(form.price) > 0 ? formatGHS(form.price) : <span className="text-muted-foreground/30 text-[11px] italic">No price yet</span>}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WarnRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2.5">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
      {children}
    </div>
  );
}
