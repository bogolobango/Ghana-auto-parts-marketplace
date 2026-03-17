import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Vendors from "./pages/Vendors";
import VendorDetail from "./pages/VendorDetail";
import VendorRegister from "./pages/VendorRegister";
import VendorDashboard from "./pages/VendorDashboard";
import Orders from "./pages/Orders";
import Notifications from "./pages/Notifications";
import Categories from "./pages/Categories";
import AdminDashboard from "./pages/AdminDashboard";
import SignIn from "./pages/SignIn";
import Wishlist from "./pages/Wishlist";
import { WishlistProvider } from "./contexts/WishlistContext";
import NewPart from "./pages/NewPart";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendors/:id" component={VendorDetail} />
      <Route path="/vendor/register" component={VendorRegister} />
      <Route path="/vendor/dashboard" component={VendorDashboard} />
      <Route path="/orders" component={Orders} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/categories" component={Categories} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/auth" component={SignIn} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/vendor/new-part" component={NewPart} />
      <Route path="/vendor/edit-part/:id" component={NewPart} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <WishlistProvider>
          <div className="min-h-screen flex flex-col zen-bg">
            <ScrollToTop />
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </WishlistProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
