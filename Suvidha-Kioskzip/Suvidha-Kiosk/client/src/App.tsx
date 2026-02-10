import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ServiceRequest from "@/pages/ServiceRequest";
import ElectricityService from "@/pages/ElectricityService";
import GasService from "@/pages/GasService";
import MunicipalService from "@/pages/MunicipalService";
import ComplaintCenter from "@/pages/ComplaintCenter";
import MyRequests from "@/pages/MyRequests";
import Documents from "@/pages/Documents";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import FaceLogin from "@/pages/FaceLogin";
import ThankYou from "@/pages/ThankYou";
import Wallet from "@/pages/Wallet";
import AppointmentBooking from "@/pages/AppointmentBooking";
import Announcements from "@/pages/Announcements";
import EmergencySOS from "@/pages/EmergencySOS";
import FeedbackPage from "@/pages/FeedbackPage";
import GovtSchemes from "@/pages/GovtSchemes";
import CertificateApplication from "@/pages/CertificateApplication";
import RTIApplication from "@/pages/RTIApplication";
import NearbyServices from "@/pages/NearbyServices";
import PropertyTaxCalc from "@/pages/PropertyTaxCalc";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/requests" component={MyRequests} />
      <Route path="/dashboard/documents" component={Documents} />
      <Route path="/dashboard/notifications" component={Notifications} />
      <Route path="/dashboard/profile" component={Profile} />
      <Route path="/dashboard/wallet" component={Wallet} />
      <Route path="/dashboard/appointments" component={AppointmentBooking} />
      <Route path="/dashboard/announcements" component={Announcements} />
      <Route path="/dashboard/emergency" component={EmergencySOS} />
      <Route path="/dashboard/feedback" component={FeedbackPage} />
      <Route path="/dashboard/schemes" component={GovtSchemes} />
      <Route path="/dashboard/certificates" component={CertificateApplication} />
      <Route path="/dashboard/rti" component={RTIApplication} />
      <Route path="/dashboard/nearby" component={NearbyServices} />
      <Route path="/dashboard/tax-calculator" component={PropertyTaxCalc} />
      <Route path="/service/electricity" component={ElectricityService} />
      <Route path="/service/gas" component={GasService} />
      <Route path="/service/municipal" component={MunicipalService} />
      <Route path="/service/water" component={MunicipalService} />
      <Route path="/service/waste" component={MunicipalService} />
      <Route path="/service/infrastructure" component={MunicipalService} />
      <Route path="/service/complaints" component={ComplaintCenter} />
      <Route path="/service/:type" component={ServiceRequest} />
      <Route path="/login/face" component={FaceLogin} />
      <Route path="/login/:method" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/thank-you" component={ThankYou} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
