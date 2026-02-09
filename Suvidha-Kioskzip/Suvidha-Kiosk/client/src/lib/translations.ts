export type TranslationKey =
  | "welcome_to"
  | "suvidha"
  | "tagline"
  | "sign_up"
  | "register_aadhaar"
  | "face_login"
  | "instant_access"
  | "mobile_login"
  | "phone_otp"
  | "scan_qr"
  | "suvidha_pass"
  | "new_citizen"
  | "instant"
  | "quick_access"
  | "select_language"
  | "help"
  | "need_help"
  | "back"
  | "home"
  | "logout"
  | "thank_you_title"
  | "thank_you_message"
  | "redirecting_home"
  | "register_aadhaar_title"
  | "enter_aadhaar"
  | "verify_fetch"
  | "clear"
  | "fetching_details"
  | "connecting_aadhaar"
  | "confirm_details"
  | "is_info_correct"
  | "permanent_address"
  | "mobile_linked"
  | "register_face"
  | "face_registration"
  | "look_camera_register"
  | "position_face"
  | "capture_face"
  | "simulate_capture"
  | "skip_face"
  | "processing_face"
  | "generating_profile"
  | "registration_success"
  | "face_registered_msg"
  | "qr_code_msg"
  | "citizen_id"
  | "face_id_registered"
  | "scan_any_kiosk"
  | "print_card"
  | "go_dashboard"
  | "digital_copy_sent"
  | "face_login_title"
  | "look_camera_login"
  | "scan_login"
  | "scan_face"
  | "no_faces_registered"
  | "identifying"
  | "matching_face"
  | "welcome_back"
  | "settings_restored"
  | "face_verified"
  | "settings_auto_restored"
  | "redirecting_dashboard"
  | "face_not_recognized"
  | "face_not_recognized_msg"
  | "try_again"
  | "login_mobile"
  | "signup_first"
  | "scan_qr_title"
  | "scan_qr_desc"
  | "enter_mobile"
  | "enter_otp"
  | "send_otp"
  | "verify_login"
  | "point_scanner"
  | "simulate_scan"
  | "enter_suvidha_id"
  | "verifying_qr"
  | "checking_suvidha_id"
  | "qr_verified"
  | "qr_login_success"
  | "welcome_kiosk"
  | "qr_invalid"
  | "qr_try_again_msg"
  | "scan_again"
  | "services_dashboard"
  | "select_service"
  | "high_alert"
  | "electricity"
  | "electricity_desc"
  | "water_supply"
  | "water_desc"
  | "gas_services"
  | "gas_desc"
  | "waste_mgmt"
  | "waste_desc"
  | "public_works"
  | "public_works_desc"
  | "my_complaints"
  | "complaints_desc"
  | "category"
  | "details"
  | "review"
  | "success"
  | "describe_issue"
  | "describe_placeholder"
  | "urgency_level"
  | "normal"
  | "high"
  | "emergency"
  | "evidence"
  | "take_photo"
  | "upload_file"
  | "summary"
  | "service_type"
  | "description"
  | "urgency"
  | "complaint_registered"
  | "complaint_id"
  | "sms_updates"
  | "print_receipt"
  | "next_step"
  | "submit_complaint"
  | "submission_complete"
  | "new_request"
  | "accessibility"
  | "text_size"
  | "high_contrast"
  | "on"
  | "off"
  | "citizen_services"
  | "dob"
  | "gender"
  | "male"
  | "female"
  | "reset"
  | "welcome_citizen"
  | "your_dashboard"
  | "preferences_applied"
  | "voice_on"
  | "large_text"
  | "current_language"
  | "pay_bill"
  | "register_complaint"
  | "new_connection"
  | "outage_info"
  | "meter_issue"
  | "billing_correction"
  | "cylinder_booking"
  | "delivery_issue"
  | "leakage_emergency"
  | "subsidy_complaint"
  | "emergency_tag"
  | "municipal_services"
  | "municipal_desc"
  | "water_services"
  | "waste_management"
  | "urban_infrastructure"
  | "no_water"
  | "leakage"
  | "low_pressure"
  | "water_quality"
  | "missed_pickup"
  | "overflowing_bins"
  | "bulk_waste"
  | "potholes"
  | "streetlights"
  | "drainage"
  | "public_toilets"
  | "complaint_center"
  | "complaint_center_desc"
  | "new_complaint"
  | "view_requests"
  | "guided_filing"
  | "my_requests"
  | "my_requests_desc"
  | "status_submitted"
  | "status_in_progress"
  | "status_resolved"
  | "sla_countdown"
  | "reopen_request"
  | "no_requests"
  | "documents_receipts"
  | "documents_desc"
  | "view_doc"
  | "print_doc"
  | "download_doc"
  | "no_documents"
  | "notifications"
  | "notifications_desc"
  | "no_notifications"
  | "mark_read"
  | "ai_assistant"
  | "ask_anything"
  | "ai_help_text"
  | "voice_tap_to_speak"
  | "voice_listening"
  | "voice_processing"
  | "voice_speaking"
  | "profile_settings"
  | "profile_desc"
  | "linked_services"
  | "login_methods"
  | "manage_preferences"
  | "auto_logout_warning"
  | "session_secure"
  | "quick_actions"
  | "view_all"
  | "pending_dues"
  | "no_pending"
  | "bill_summary"
  | "total_amount"
  | "select_payment"
  | "upi_payment"
  | "cash_payment"
  | "insert_cash"
  | "suvidha_wallet_pay"
  | "balance"
  | "scan_upi_qr"
  | "or_enter_upi"
  | "insert_notes"
  | "cash_accepted"
  | "wallet_balance"
  | "after_payment"
  | "pay_now"
  | "processing_payment"
  | "payment_successful"
  | "paid_successfully"
  | "payment_method_label"
  | "pay_electricity_bill"
  | "new_elec_connection"
  | "report_outage"
  | "meter_fault"
  | "select_elec_service"
  | "enter_consumer_id"
  | "consumer_id"
  | "fetch_bill"
  | "consumer_not_found"
  | "sample_ids"
  | "bill_details"
  | "name"
  | "meter_number"
  | "units_consumed"
  | "due_date"
  | "last_payment"
  | "overdue"
  | "proceed_pay"
  | "fill_connection_form"
  | "full_name"
  | "phone_number"
  | "address"
  | "aadhaar_number"
  | "load_type"
  | "single_phase"
  | "three_phase"
  | "submit_application"
  | "report_outage_desc"
  | "affected_area"
  | "outage_safety_tip"
  | "report_now"
  | "issue_type"
  | "additional_details"
  | "provide_details"
  | "request_submitted"
  | "more_services"
  | "book_cylinder"
  | "pay_gas_bill"
  | "report_leakage"
  | "new_gas_connection"
  | "track_delivery"
  | "subsidy_status"
  | "select_gas_service"
  | "select_cylinder_type"
  | "cylinder_type"
  | "quantity"
  | "unit_price"
  | "enter_gas_id"
  | "gas_emergency_desc"
  | "emergency_helpline"
  | "available_24x7"
  | "location"
  | "severity"
  | "connection_type"
  | "delivery_status_desc"
  | "check_subsidy_desc"
  | "check_status"
  | "subsidy_amount"
  | "last_credit"
  | "bank_account"
  | "pay_water_bill"
  | "new_water_connection"
  | "report_water_leak"
  | "water_quality_issue"
  | "property_type"
  | "bulk_waste_request"
  | "waste_type"
  | "report_pothole"
  | "streetlight_issue"
  | "drainage_issue"
  | "photo_recommended"
  | "complaint_not_found"
  | "ticket_not_eligible"
  | "status_closed"
  | "status_rejected"
  | "helpline_info"
  | "toll_free"
  | "gas_emergency"
  | "general_emergency"
  | "select_service_type"
  | "issue_types"
  | "select_issue"
  | "complaint_details"
  | "location_address"
  | "enter_location"
  | "contact_phone"
  | "enter_phone"
  | "review_complaint"
  | "track_with_id"
  | "file_another"
  | "check_complaint_status"
  | "enter_complaint_id"
  | "filed_date"
  | "last_update"
  | "assigned_to"
  | "sla_time"
  | "resolution"
  | "reopen_ticket"
  | "complaint_timeline"
  | "reopen_ticket_info"
  | "reopen_eligible_note"
  | "previous_resolution"
  | "reopen_reason"
  | "reopen_reason_placeholder"
  | "cancel"
  | "confirm_reopen"
  | "ticket_reopened"
  | "reopen_confirmation_msg"
  | "view_status"
  | "back_to_menu"
  | "register_new_complaint"
  | "register_complaint_desc"
  | "check_status_desc"
  | "reopen_ticket_desc"
  | "wallet"
  | "wallet_desc"
  | "wallet_balance"
  | "add_money"
  | "transaction_history"
  | "no_transactions"
  | "add_funds"
  | "select_amount"
  | "custom_amount"
  | "enter_upi_id"
  | "pay_via_upi"
  | "processing_payment"
  | "payment_successful"
  | "amount_added"
  | "new_balance"
  | "back_to_wallet"
  | "pin_location"
  | "location_pinned"
  | "tap_map_pin";

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  welcome_to: "Welcome to",
  suvidha: "SUVIDHA",
  tagline: "Your one-stop digital kiosk for all civic services",
  sign_up: "Sign Up",
  register_aadhaar: "Register using Aadhaar",
  face_login: "Face Login",
  instant_access: "Instant access with face scan",
  mobile_login: "Mobile Login",
  phone_otp: "Use phone number & OTP",
  scan_qr: "Scan QR",
  suvidha_pass: "Login with Suvidha Pass",
  new_citizen: "New Citizen",
  instant: "Instant",
  quick_access: "Quick Access",
  select_language: "Select your preferred language below or tap",
  help: "Help",
  need_help: "Need Help?",
  back: "Back",
  home: "Home",
  logout: "Logout",
  thank_you_title: "Thank You for Using SUVIDHA",
  thank_you_message: "Your session has ended. The kiosk will reset shortly.",
  redirecting_home: "Redirecting to home...",
  register_aadhaar_title: "Register with Aadhaar",
  enter_aadhaar: "Enter your 12-digit Aadhaar number to begin",
  verify_fetch: "Verify & Fetch Details",
  clear: "Clear",
  fetching_details: "Fetching Details",
  connecting_aadhaar: "Connecting to Aadhaar secure server...",
  confirm_details: "Confirm Your Details",
  is_info_correct: "Is this information correct?",
  permanent_address: "Permanent Address",
  mobile_linked: "Mobile Linked",
  register_face: "Register Face for Quick Login",
  face_registration: "Face Registration",
  look_camera_register: "Look at the camera to register your face for instant login",
  position_face: "Position your face in the circle",
  capture_face: "Capture Face",
  simulate_capture: "Simulate Capture",
  skip_face: "Skip Face Registration",
  processing_face: "Processing Face Data",
  generating_profile: "Generating secure face profile...",
  registration_success: "Registration Successful",
  face_registered_msg: "Face registered! You can now login instantly with face scan.",
  qr_code_msg: "Here is your Permanent Suvidha QR Code",
  citizen_id: "Citizen ID",
  face_id_registered: "Face ID registered - use Face Login at any kiosk",
  scan_any_kiosk: "Scan this at any kiosk for instant login",
  print_card: "Print Card",
  go_dashboard: "Go to Dashboard",
  digital_copy_sent: "A digital copy has been sent to your linked mobile number.",
  face_login_title: "Face Login",
  look_camera_login: "Look at the camera for instant access",
  scan_login: "Scan & Login",
  scan_face: "Scan Face",
  no_faces_registered: "No faces registered yet. Please sign up first to use face login.",
  identifying: "Identifying...",
  matching_face: "Matching face with registered users",
  welcome_back: "Welcome Back!",
  settings_restored: "Your language & accessibility settings have been restored",
  face_verified: "Face Verified",
  settings_auto_restored: "Settings restored automatically",
  redirecting_dashboard: "Redirecting to dashboard...",
  face_not_recognized: "Face Not Recognized",
  face_not_recognized_msg: "We couldn't match your face. Try again or use another login method.",
  try_again: "Try Again",
  login_mobile: "Login with Mobile",
  signup_first: "Sign Up First",
  scan_qr_title: "Scan QR Code",
  scan_qr_desc: "Scan the QR code from your Suvidha mobile app",
  enter_mobile: "Enter your 10-digit mobile number",
  enter_otp: "Enter the 6-digit OTP sent to your mobile",
  send_otp: "Send OTP",
  verify_login: "Verify & Login",
  point_scanner: "Point your kiosk scanner at the QR code on your mobile device",
  simulate_scan: "Simulate Scan Success",
  enter_suvidha_id: "Or enter your Suvidha ID manually",
  verifying_qr: "Verifying QR Code",
  checking_suvidha_id: "Checking your Suvidha ID...",
  qr_verified: "QR Code Verified!",
  qr_login_success: "Login Successful",
  welcome_kiosk: "Welcome to Suvidha Kiosk",
  qr_invalid: "Invalid QR Code",
  qr_try_again_msg: "The scanned QR code is not recognized. Please try again.",
  scan_again: "Scan Again",
  services_dashboard: "Services Dashboard",
  select_service: "Select a service to proceed",
  high_alert: "High Alert: Heavy Rain Warning",
  electricity: "Electricity",
  electricity_desc: "Bill payment, new connection, outages",
  water_supply: "Water Supply",
  water_desc: "Leakage, quality, new connection",
  gas_services: "Gas Services",
  gas_desc: "Cylinder booking, leakage report",
  waste_mgmt: "Waste Mgmt",
  waste_desc: "Pickup issues, cleaning request",
  public_works: "Public Works",
  public_works_desc: "Roads, streetlights, drainage",
  my_complaints: "My Complaints",
  complaints_desc: "Track status, history",
  category: "Category",
  details: "Details",
  review: "Review",
  success: "Success",
  describe_issue: "Describe the Issue",
  describe_placeholder: "Please describe the problem in detail...",
  urgency_level: "Urgency Level",
  normal: "Normal",
  high: "High",
  emergency: "Emergency",
  evidence: "Evidence (Optional)",
  take_photo: "Take Photo",
  upload_file: "Upload File",
  summary: "Summary",
  service_type: "Service Type",
  description: "Description",
  urgency: "Urgency",
  complaint_registered: "Complaint Registered!",
  complaint_id: "Your Complaint ID is",
  sms_updates: "You will receive SMS updates on your registered mobile number.",
  print_receipt: "Print Receipt",
  next_step: "Next Step",
  submit_complaint: "Submit Complaint",
  submission_complete: "Submission Complete",
  new_request: "New {type} Request",
  accessibility: "Accessibility",
  text_size: "Text Size",
  high_contrast: "High Contrast",
  on: "On",
  off: "Off",
  citizen_services: "Citizen Services",
  dob: "DOB",
  gender: "Gender",
  male: "Male",
  female: "Female",
  reset: "Reset",
  welcome_citizen: "Welcome, Citizen",
  your_dashboard: "Your Personalized Dashboard",
  preferences_applied: "Your preferences are applied",
  voice_on: "Voice ON",
  large_text: "Large Text",
  current_language: "Language",
  pay_bill: "Pay Bill",
  register_complaint: "Register Complaint",
  new_connection: "New Connection",
  outage_info: "Outage Info",
  meter_issue: "Meter Issue",
  billing_correction: "Billing Correction",
  cylinder_booking: "Cylinder Booking",
  delivery_issue: "Delivery Issue",
  leakage_emergency: "Leakage Emergency",
  subsidy_complaint: "Subsidy Complaint",
  emergency_tag: "EMERGENCY",
  municipal_services: "Municipal Services",
  municipal_desc: "Water, waste, roads & infrastructure",
  water_services: "Water",
  waste_management: "Waste",
  urban_infrastructure: "Infrastructure",
  no_water: "No Water",
  leakage: "Leakage",
  low_pressure: "Low Pressure",
  water_quality: "Water Quality",
  missed_pickup: "Missed Pickup",
  overflowing_bins: "Overflowing Bins",
  bulk_waste: "Bulk Waste",
  potholes: "Potholes",
  streetlights: "Streetlights",
  drainage: "Drainage",
  public_toilets: "Public Toilets",
  complaint_center: "Complaint Center",
  complaint_center_desc: "Register & track complaints",
  new_complaint: "New Complaint",
  view_requests: "View My Requests",
  guided_filing: "Guided Filing",
  my_requests: "My Requests",
  my_requests_desc: "Track all complaints & payments",
  status_submitted: "Submitted",
  status_in_progress: "In Progress",
  status_resolved: "Resolved",
  sla_countdown: "SLA Deadline",
  reopen_request: "Reopen",
  no_requests: "No requests yet",
  documents_receipts: "Documents",
  documents_desc: "Receipts, certificates & files",
  view_doc: "View",
  print_doc: "Print",
  download_doc: "Download",
  no_documents: "No documents yet",
  notifications: "Notifications",
  notifications_desc: "Alerts & updates",
  no_notifications: "No notifications",
  mark_read: "Mark Read",
  ai_assistant: "AI Assistant",
  ask_anything: "Ask me anything...",
  ai_help_text: "I can help with complaints, forms, and service info",
  voice_tap_to_speak: "Tap the mic to speak or type below",
  voice_listening: "Listening...",
  voice_processing: "Processing...",
  voice_speaking: "Speaking...",
  profile_settings: "Profile",
  profile_desc: "Preferences & linked services",
  linked_services: "Linked Services",
  login_methods: "Login Methods",
  manage_preferences: "Manage Preferences",
  auto_logout_warning: "Auto logout in",
  session_secure: "Session is secure",
  quick_actions: "Quick Actions",
  view_all: "View All",
  pending_dues: "Pending Dues",
  no_pending: "No pending dues",
  bill_summary: "Bill Summary",
  total_amount: "Total Amount",
  select_payment: "Select Payment Method",
  upi_payment: "UPI Payment",
  cash_payment: "Cash Payment",
  insert_cash: "Insert cash at kiosk",
  suvidha_wallet_pay: "Suvidha Wallet",
  balance: "Balance",
  scan_upi_qr: "Scan UPI QR Code",
  or_enter_upi: "Or enter your UPI ID",
  insert_notes: "Insert notes into the cash acceptor",
  cash_accepted: "₹10, ₹20, ₹50, ₹100, ₹200, ₹500 notes accepted",
  wallet_balance: "Wallet Balance",
  after_payment: "After Payment",
  pay_now: "Pay Now",
  processing_payment: "Processing Payment",
  payment_successful: "Payment Successful!",
  paid_successfully: "paid successfully",
  payment_method_label: "Payment Method",
  pay_electricity_bill: "Pay Electricity Bill",
  new_elec_connection: "New Electricity Connection",
  report_outage: "Report Outage",
  meter_fault: "Meter Fault",
  select_elec_service: "Select an electricity service",
  enter_consumer_id: "Enter your Consumer ID",
  consumer_id: "Consumer ID",
  fetch_bill: "Fetch Bill",
  consumer_not_found: "Consumer ID not found. Please check and try again.",
  sample_ids: "Sample IDs",
  bill_details: "Bill Details",
  name: "Name",
  meter_number: "Meter Number",
  units_consumed: "Units Consumed",
  due_date: "Due Date",
  last_payment: "Last Payment",
  overdue: "Overdue",
  proceed_pay: "Proceed to Pay",
  fill_connection_form: "Fill New Connection Form",
  full_name: "Full Name",
  phone_number: "Phone Number",
  address: "Address",
  aadhaar_number: "Aadhaar Number",
  load_type: "Load Type",
  single_phase: "Single Phase",
  three_phase: "Three Phase",
  submit_application: "Submit Application",
  report_outage_desc: "Report a power outage in your area",
  affected_area: "Affected Area",
  outage_safety_tip: "Stay away from fallen power lines and report immediately",
  report_now: "Report Now",
  issue_type: "Issue Type",
  additional_details: "Additional Details",
  provide_details: "Please provide details about the issue",
  request_submitted: "Request Submitted!",
  more_services: "More Services",
  book_cylinder: "Book Cylinder",
  pay_gas_bill: "Pay Gas Bill",
  report_leakage: "Report Gas Leakage",
  new_gas_connection: "New Gas Connection",
  track_delivery: "Track Delivery",
  subsidy_status: "Subsidy Status",
  select_gas_service: "Select a gas service",
  select_cylinder_type: "Select Cylinder Type",
  cylinder_type: "Cylinder Type",
  quantity: "Quantity",
  unit_price: "Unit Price",
  enter_gas_id: "Enter your Gas / LPG ID",
  gas_emergency_desc: "If you smell gas, leave the area immediately and call emergency services",
  emergency_helpline: "Emergency Helpline",
  available_24x7: "Available 24x7",
  location: "Location",
  severity: "Severity",
  connection_type: "Connection Type",
  delivery_status_desc: "Track your cylinder delivery status",
  check_subsidy_desc: "Check your LPG subsidy status",
  check_status: "Check Status",
  subsidy_amount: "Subsidy Amount",
  last_credit: "Last Credit",
  bank_account: "Bank Account",
  pay_water_bill: "Pay Water Bill",
  new_water_connection: "New Water Connection",
  report_water_leak: "Report Water Leak",
  water_quality_issue: "Water Quality Issue",
  property_type: "Property Type",
  bulk_waste_request: "Bulk Waste Request",
  waste_type: "Waste Type",
  report_pothole: "Report Pothole",
  streetlight_issue: "Streetlight Issue",
  drainage_issue: "Drainage Issue",
  photo_recommended: "Photo recommended for faster resolution",
  complaint_not_found: "Complaint not found. Please check the ID and try again.",
  ticket_not_eligible: "This ticket is still active and cannot be reopened. Only resolved or closed tickets can be reopened.",
  status_closed: "Closed",
  status_rejected: "Rejected",
  helpline_info: "Helpline Numbers",
  toll_free: "Toll Free (All Services)",
  gas_emergency: "Gas Emergency",
  general_emergency: "General Emergency",
  select_service_type: "Select Service Type",
  issue_types: "issue types",
  select_issue: "Select Issue Type",
  complaint_details: "Complaint Details",
  location_address: "Location / Address",
  enter_location: "Enter area, ward, or full address",
  contact_phone: "Contact Phone",
  enter_phone: "Enter 10-digit mobile number",
  review_complaint: "Review Your Complaint",
  track_with_id: "Use this complaint ID to track status or reopen the ticket anytime at this kiosk.",
  file_another: "File Another Complaint",
  check_complaint_status: "Check Complaint Status",
  enter_complaint_id: "Enter your complaint ID to view current status and timeline",
  filed_date: "Filed Date",
  last_update: "Last Update",
  assigned_to: "Assigned To",
  sla_time: "SLA Time",
  resolution: "Resolution",
  reopen_ticket: "Reopen Ticket",
  complaint_timeline: "Complaint Timeline",
  reopen_ticket_info: "Reopen a previously resolved or closed complaint if the issue persists",
  reopen_eligible_note: "Only resolved or closed tickets can be reopened",
  previous_resolution: "Previous Resolution",
  reopen_reason: "Reason for Reopening",
  reopen_reason_placeholder: "Explain why the issue is not resolved or has recurred...",
  cancel: "Cancel",
  confirm_reopen: "Confirm Reopen",
  ticket_reopened: "Ticket Reopened Successfully",
  reopen_confirmation_msg: "Your complaint has been reopened and assigned for re-investigation. You will receive SMS updates.",
  view_status: "View Status",
  back_to_menu: "Back to Menu",
  register_new_complaint: "Register New Complaint",
  register_complaint_desc: "File a new complaint for any civic service",
  check_status_desc: "Look up status and timeline of your complaint",
  reopen_ticket_desc: "Reopen a resolved or closed complaint",
  wallet: "Wallet",
  wallet_desc: "Balance & transactions",
  add_money: "Add Money",
  transaction_history: "Transaction History",
  no_transactions: "No transactions yet",
  add_funds: "Add Funds",
  select_amount: "Select Amount",
  custom_amount: "Custom Amount",
  enter_upi_id: "Enter UPI ID",
  pay_via_upi: "Pay via UPI",
  amount_added: "Amount Added",
  new_balance: "New Balance",
  back_to_wallet: "Back to Wallet",
  pin_location: "Pin Location",
  location_pinned: "Location Pinned",
  tap_map_pin: "Tap on map to pin location",
};

const hi: Translations = {
  welcome_to: "स्वागत है",
  suvidha: "सुविधा",
  tagline: "सभी नागरिक सेवाओं के लिए आपका एकमात्र डिजिटल कियोस्क",
  sign_up: "पंजीकरण",
  register_aadhaar: "आधार से पंजीकरण करें",
  face_login: "फेस लॉगिन",
  instant_access: "फेस स्कैन से तुरंत पहुंच",
  mobile_login: "मोबाइल लॉगिन",
  phone_otp: "फोन नंबर और OTP से",
  scan_qr: "QR स्कैन",
  suvidha_pass: "सुविधा पास से लॉगिन",
  new_citizen: "नया नागरिक",
  instant: "तुरंत",
  quick_access: "त्वरित पहुंच",
  select_language: "नीचे अपनी भाषा चुनें या टैप करें",
  help: "मदद",
  need_help: "मदद चाहिए?",
  back: "वापस",
  home: "होम",
  logout: "लॉगआउट",
  thank_you_title: "सुविधा का उपयोग करने के लिए धन्यवाद",
  thank_you_message: "आपका सत्र समाप्त हो गया है। कियोस्क जल्द ही रीसेट होगा।",
  redirecting_home: "होम पर जा रहे हैं...",
  register_aadhaar_title: "आधार से पंजीकरण",
  enter_aadhaar: "शुरू करने के लिए अपना 12 अंकों का आधार नंबर दर्ज करें",
  verify_fetch: "सत्यापित करें और विवरण प्राप्त करें",
  clear: "साफ करें",
  fetching_details: "विवरण प्राप्त हो रहे हैं",
  connecting_aadhaar: "आधार सुरक्षित सर्वर से कनेक्ट हो रहा है...",
  confirm_details: "अपने विवरण की पुष्टि करें",
  is_info_correct: "क्या यह जानकारी सही है?",
  permanent_address: "स्थायी पता",
  mobile_linked: "लिंक्ड मोबाइल",
  register_face: "त्वरित लॉगिन के लिए फेस पंजीकृत करें",
  face_registration: "फेस पंजीकरण",
  look_camera_register: "तुरंत लॉगिन के लिए कैमरे में देखें",
  position_face: "अपना चेहरा वृत्त में रखें",
  capture_face: "फेस कैप्चर करें",
  simulate_capture: "सिमुलेट कैप्चर",
  skip_face: "फेस पंजीकरण छोड़ें",
  processing_face: "फेस डेटा प्रोसेस हो रहा है",
  generating_profile: "सुरक्षित फेस प्रोफाइल बन रही है...",
  registration_success: "पंजीकरण सफल",
  face_registered_msg: "फेस पंजीकृत! अब आप फेस स्कैन से तुरंत लॉगिन कर सकते हैं।",
  qr_code_msg: "यह आपका स्थायी सुविधा QR कोड है",
  citizen_id: "नागरिक आईडी",
  face_id_registered: "फेस आईडी पंजीकृत - किसी भी कियोस्क पर फेस लॉगिन करें",
  scan_any_kiosk: "तुरंत लॉगिन के लिए किसी भी कियोस्क पर स्कैन करें",
  print_card: "कार्ड प्रिंट करें",
  go_dashboard: "डैशबोर्ड पर जाएं",
  digital_copy_sent: "डिजिटल कॉपी आपके लिंक्ड मोबाइल नंबर पर भेज दी गई है।",
  face_login_title: "फेस लॉगिन",
  look_camera_login: "तुरंत पहुंच के लिए कैमरे में देखें",
  scan_login: "स्कैन और लॉगिन",
  scan_face: "फेस स्कैन",
  no_faces_registered: "अभी तक कोई फेस पंजीकृत नहीं है। कृपया पहले साइन अप करें।",
  identifying: "पहचान हो रही है...",
  matching_face: "पंजीकृत उपयोगकर्ताओं से मिलान",
  welcome_back: "वापसी पर स्वागत!",
  settings_restored: "आपकी भाषा और एक्सेसिबिलिटी सेटिंग्स पुनर्स्थापित हो गई हैं",
  face_verified: "फेस सत्यापित",
  settings_auto_restored: "सेटिंग्स स्वचालित रूप से पुनर्स्थापित",
  redirecting_dashboard: "डैशबोर्ड पर जा रहे हैं...",
  face_not_recognized: "चेहरा पहचाना नहीं गया",
  face_not_recognized_msg: "हम आपका चेहरा मैच नहीं कर सके। पुनः प्रयास करें या अन्य तरीके से लॉगिन करें।",
  try_again: "पुनः प्रयास करें",
  login_mobile: "मोबाइल से लॉगिन",
  signup_first: "पहले साइन अप करें",
  scan_qr_title: "QR कोड स्कैन करें",
  scan_qr_desc: "अपने सुविधा मोबाइल ऐप से QR कोड स्कैन करें",
  enter_mobile: "अपना 10 अंकों का मोबाइल नंबर दर्ज करें",
  enter_otp: "आपके मोबाइल पर भेजा गया 6 अंकों का OTP दर्ज करें",
  send_otp: "OTP भेजें",
  verify_login: "सत्यापित करें और लॉगिन करें",
  point_scanner: "अपने मोबाइल डिवाइस पर QR कोड की ओर कियोस्क स्कैनर रखें",
  simulate_scan: "स्कैन सफलता सिमुलेट करें",
  enter_suvidha_id: "या अपना सुविधा ID मैन्युअल दर्ज करें",
  verifying_qr: "QR कोड सत्यापित हो रहा है",
  checking_suvidha_id: "आपका सुविधा ID जांचा जा रहा है...",
  qr_verified: "QR कोड सत्यापित!",
  qr_login_success: "लॉगिन सफल",
  welcome_kiosk: "सुविधा कियोस्क में स्वागत है",
  qr_invalid: "अमान्य QR कोड",
  qr_try_again_msg: "स्कैन किया गया QR कोड पहचाना नहीं गया। कृपया पुनः प्रयास करें।",
  scan_again: "फिर से स्कैन करें",
  services_dashboard: "सेवा डैशबोर्ड",
  select_service: "आगे बढ़ने के लिए एक सेवा चुनें",
  high_alert: "उच्च चेतावनी: भारी बारिश की चेतावनी",
  electricity: "बिजली",
  electricity_desc: "बिल भुगतान, नया कनेक्शन, बिजली कटौती",
  water_supply: "जल आपूर्ति",
  water_desc: "रिसाव, गुणवत्ता, नया कनेक्शन",
  gas_services: "गैस सेवाएं",
  gas_desc: "सिलेंडर बुकिंग, रिसाव रिपोर्ट",
  waste_mgmt: "कचरा प्रबंधन",
  waste_desc: "पिकअप समस्या, सफाई अनुरोध",
  public_works: "लोक निर्माण",
  public_works_desc: "सड़कें, स्ट्रीटलाइट, जल निकासी",
  my_complaints: "मेरी शिकायतें",
  complaints_desc: "स्थिति ट्रैक, इतिहास",
  category: "श्रेणी",
  details: "विवरण",
  review: "समीक्षा",
  success: "सफलता",
  describe_issue: "समस्या का वर्णन करें",
  describe_placeholder: "कृपया समस्या का विस्तार से वर्णन करें...",
  urgency_level: "तात्कालिकता स्तर",
  normal: "सामान्य",
  high: "उच्च",
  emergency: "आपातकालीन",
  evidence: "साक्ष्य (वैकल्पिक)",
  take_photo: "फोटो लें",
  upload_file: "फाइल अपलोड",
  summary: "सारांश",
  service_type: "सेवा प्रकार",
  description: "विवरण",
  urgency: "तात्कालिकता",
  complaint_registered: "शिकायत दर्ज!",
  complaint_id: "आपकी शिकायत आईडी है",
  sms_updates: "आपके पंजीकृत मोबाइल नंबर पर SMS अपडेट प्राप्त होंगे।",
  print_receipt: "रसीद प्रिंट करें",
  next_step: "अगला कदम",
  submit_complaint: "शिकायत दर्ज करें",
  submission_complete: "सबमिशन पूर्ण",
  new_request: "नया {type} अनुरोध",
  accessibility: "एक्सेसिबिलिटी",
  text_size: "टेक्स्ट आकार",
  high_contrast: "उच्च कंट्रास्ट",
  on: "चालू",
  off: "बंद",
  citizen_services: "नागरिक सेवाएं",
  dob: "जन्मतिथि",
  gender: "लिंग",
  male: "पुरुष",
  female: "महिला",
  reset: "रीसेट",
  welcome_citizen: "स्वागत, नागरिक",
  your_dashboard: "आपका व्यक्तिगत डैशबोर्ड",
  preferences_applied: "आपकी प्राथमिकताएं लागू हैं",
  voice_on: "आवाज़ चालू",
  large_text: "बड़ा टेक्स्ट",
  current_language: "भाषा",
  pay_bill: "बिल भुगतान",
  register_complaint: "शिकायत दर्ज करें",
  new_connection: "नया कनेक्शन",
  outage_info: "बिजली कटौती जानकारी",
  meter_issue: "मीटर समस्या",
  billing_correction: "बिलिंग सुधार",
  cylinder_booking: "सिलेंडर बुकिंग",
  delivery_issue: "डिलीवरी समस्या",
  leakage_emergency: "गैस रिसाव आपातकाल",
  subsidy_complaint: "सब्सिडी शिकायत",
  emergency_tag: "आपातकालीन",
  municipal_services: "नगरपालिका सेवाएं",
  municipal_desc: "जल, कचरा, सड़कें और बुनियादी ढांचा",
  water_services: "जल",
  waste_management: "कचरा",
  urban_infrastructure: "बुनियादी ढांचा",
  no_water: "पानी नहीं",
  leakage: "रिसाव",
  low_pressure: "कम दबाव",
  water_quality: "जल गुणवत्ता",
  missed_pickup: "पिकअप छूटा",
  overflowing_bins: "भरे हुए कूड़ेदान",
  bulk_waste: "भारी कचरा",
  potholes: "गड्ढे",
  streetlights: "स्ट्रीटलाइट",
  drainage: "जल निकासी",
  public_toilets: "सार्वजनिक शौचालय",
  complaint_center: "शिकायत केंद्र",
  complaint_center_desc: "शिकायत दर्ज करें और ट्रैक करें",
  new_complaint: "नई शिकायत",
  view_requests: "मेरे अनुरोध देखें",
  guided_filing: "मार्गदर्शित शिकायत",
  my_requests: "मेरे अनुरोध",
  my_requests_desc: "सभी शिकायतें और भुगतान ट्रैक करें",
  status_submitted: "सबमिट किया गया",
  status_in_progress: "प्रगति में",
  status_resolved: "समाधान",
  sla_countdown: "SLA समय सीमा",
  reopen_request: "फिर से खोलें",
  no_requests: "अभी कोई अनुरोध नहीं",
  documents_receipts: "दस्तावेज़",
  documents_desc: "रसीदें, प्रमाणपत्र और फाइलें",
  view_doc: "देखें",
  print_doc: "प्रिंट",
  download_doc: "डाउनलोड",
  no_documents: "अभी कोई दस्तावेज़ नहीं",
  notifications: "सूचनाएं",
  notifications_desc: "अलर्ट और अपडेट",
  no_notifications: "कोई सूचना नहीं",
  mark_read: "पढ़ा गया",
  ai_assistant: "AI सहायक",
  ask_anything: "कुछ भी पूछें...",
  ai_help_text: "मैं शिकायतों, फॉर्म और सेवा जानकारी में मदद कर सकता हूं",
  voice_tap_to_speak: "बोलने के लिए माइक दबाएं या नीचे टाइप करें",
  voice_listening: "सुन रहा है...",
  voice_processing: "प्रोसेसिंग...",
  voice_speaking: "बोल रहा है...",
  profile_settings: "प्रोफाइल",
  profile_desc: "प्राथमिकताएं और जुड़ी सेवाएं",
  linked_services: "जुड़ी सेवाएं",
  login_methods: "लॉगिन तरीके",
  manage_preferences: "प्राथमिकताएं प्रबंधित करें",
  auto_logout_warning: "ऑटो लॉगआउट",
  session_secure: "सत्र सुरक्षित है",
  quick_actions: "त्वरित कार्य",
  view_all: "सभी देखें",
  pending_dues: "बकाया राशि",
  no_pending: "कोई बकाया नहीं",
  bill_summary: "बिल सारांश",
  total_amount: "कुल राशि",
  select_payment: "भुगतान विधि चुनें",
  upi_payment: "UPI भुगतान",
  cash_payment: "नकद भुगतान",
  insert_cash: "कियोस्क में नकद डालें",
  suvidha_wallet_pay: "सुविधा वॉलेट",
  balance: "शेष राशि",
  scan_upi_qr: "UPI QR कोड स्कैन करें",
  or_enter_upi: "या अपना UPI ID दर्ज करें",
  insert_notes: "कैश एक्सेप्टर में नोट डालें",
  cash_accepted: "₹10, ₹20, ₹50, ₹100, ₹200, ₹500 के नोट स्वीकार्य",
  wallet_balance: "वॉलेट शेष",
  after_payment: "भुगतान के बाद",
  pay_now: "अभी भुगतान करें",
  processing_payment: "भुगतान प्रोसेस हो रहा है",
  payment_successful: "भुगतान सफल!",
  paid_successfully: "सफलतापूर्वक भुगतान किया गया",
  payment_method_label: "भुगतान विधि",
  pay_electricity_bill: "बिजली बिल भुगतान",
  new_elec_connection: "नया बिजली कनेक्शन",
  report_outage: "बिजली कटौती रिपोर्ट",
  meter_fault: "मीटर खराबी",
  select_elec_service: "बिजली सेवा चुनें",
  enter_consumer_id: "अपना उपभोक्ता आईडी दर्ज करें",
  consumer_id: "उपभोक्ता आईडी",
  fetch_bill: "बिल प्राप्त करें",
  consumer_not_found: "उपभोक्ता आईडी नहीं मिला। कृपया जांचें और पुनः प्रयास करें।",
  sample_ids: "नमूना आईडी",
  bill_details: "बिल विवरण",
  name: "नाम",
  meter_number: "मीटर नंबर",
  units_consumed: "खपत इकाइयां",
  due_date: "देय तिथि",
  last_payment: "अंतिम भुगतान",
  overdue: "अतिदेय",
  proceed_pay: "भुगतान करें",
  fill_connection_form: "नया कनेक्शन फॉर्म भरें",
  full_name: "पूरा नाम",
  phone_number: "फोन नंबर",
  address: "पता",
  aadhaar_number: "आधार नंबर",
  load_type: "लोड प्रकार",
  single_phase: "सिंगल फेज",
  three_phase: "थ्री फेज",
  submit_application: "आवेदन जमा करें",
  report_outage_desc: "अपने क्षेत्र में बिजली कटौती की रिपोर्ट करें",
  affected_area: "प्रभावित क्षेत्र",
  outage_safety_tip: "गिरी हुई बिजली की तारों से दूर रहें और तुरंत रिपोर्ट करें",
  report_now: "अभी रिपोर्ट करें",
  issue_type: "समस्या प्रकार",
  additional_details: "अतिरिक्त विवरण",
  provide_details: "कृपया समस्या के बारे में विवरण दें",
  request_submitted: "अनुरोध सबमिट हो गया!",
  more_services: "और सेवाएं",
  book_cylinder: "सिलेंडर बुक करें",
  pay_gas_bill: "गैस बिल भुगतान",
  report_leakage: "गैस रिसाव रिपोर्ट",
  new_gas_connection: "नया गैस कनेक्शन",
  track_delivery: "डिलीवरी ट्रैक करें",
  subsidy_status: "सब्सिडी स्थिति",
  select_gas_service: "गैस सेवा चुनें",
  select_cylinder_type: "सिलेंडर प्रकार चुनें",
  cylinder_type: "सिलेंडर प्रकार",
  quantity: "मात्रा",
  unit_price: "इकाई मूल्य",
  enter_gas_id: "अपना गैस / LPG आईडी दर्ज करें",
  gas_emergency_desc: "अगर गैस की गंध आए, तुरंत क्षेत्र छोड़ें और आपातकालीन सेवाओं को कॉल करें",
  emergency_helpline: "आपातकालीन हेल्पलाइन",
  available_24x7: "24x7 उपलब्ध",
  location: "स्थान",
  severity: "गंभीरता",
  connection_type: "कनेक्शन प्रकार",
  delivery_status_desc: "अपनी सिलेंडर डिलीवरी की स्थिति ट्रैक करें",
  check_subsidy_desc: "अपनी LPG सब्सिडी की स्थिति जांचें",
  check_status: "स्थिति जांचें",
  subsidy_amount: "सब्सिडी राशि",
  last_credit: "अंतिम क्रेडिट",
  bank_account: "बैंक खाता",
  pay_water_bill: "पानी बिल भुगतान",
  new_water_connection: "नया पानी कनेक्शन",
  report_water_leak: "पानी रिसाव रिपोर्ट",
  water_quality_issue: "जल गुणवत्ता समस्या",
  property_type: "संपत्ति प्रकार",
  bulk_waste_request: "भारी कचरा अनुरोध",
  waste_type: "कचरा प्रकार",
  report_pothole: "गड्ढे की रिपोर्ट",
  streetlight_issue: "स्ट्रीटलाइट समस्या",
  drainage_issue: "जल निकासी समस्या",
  photo_recommended: "तेज समाधान के लिए फोटो अनुशंसित",
  complaint_not_found: "शिकायत नहीं मिली। कृपया आईडी जांचें और पुनः प्रयास करें।",
  ticket_not_eligible: "यह टिकट अभी सक्रिय है और फिर से नहीं खोला जा सकता। केवल हल या बंद टिकट ही फिर से खोले जा सकते हैं।",
  status_closed: "बंद",
  status_rejected: "अस्वीकृत",
  helpline_info: "हेल्पलाइन नंबर",
  toll_free: "टोल फ्री (सभी सेवाएं)",
  gas_emergency: "गैस आपातकाल",
  general_emergency: "सामान्य आपातकाल",
  select_service_type: "सेवा प्रकार चुनें",
  issue_types: "समस्या प्रकार",
  select_issue: "समस्या प्रकार चुनें",
  complaint_details: "शिकायत विवरण",
  location_address: "स्थान / पता",
  enter_location: "क्षेत्र, वार्ड, या पूरा पता दर्ज करें",
  contact_phone: "संपर्क फोन",
  enter_phone: "10 अंकों का मोबाइल नंबर दर्ज करें",
  review_complaint: "अपनी शिकायत की समीक्षा करें",
  track_with_id: "इस शिकायत आईडी का उपयोग करके स्थिति ट्रैक करें या कभी भी इस कियोस्क पर टिकट फिर से खोलें।",
  file_another: "एक और शिकायत दर्ज करें",
  check_complaint_status: "शिकायत की स्थिति जांचें",
  enter_complaint_id: "वर्तमान स्थिति और समयरेखा देखने के लिए अपनी शिकायत आईडी दर्ज करें",
  filed_date: "दर्ज तिथि",
  last_update: "अंतिम अपडेट",
  assigned_to: "सौंपा गया",
  sla_time: "SLA समय",
  resolution: "समाधान",
  reopen_ticket: "टिकट फिर से खोलें",
  complaint_timeline: "शिकायत समयरेखा",
  reopen_ticket_info: "यदि समस्या बनी रहती है तो पहले हल या बंद शिकायत फिर से खोलें",
  reopen_eligible_note: "केवल हल या बंद टिकट ही फिर से खोले जा सकते हैं",
  previous_resolution: "पिछला समाधान",
  reopen_reason: "फिर से खोलने का कारण",
  reopen_reason_placeholder: "बताएं कि समस्या क्यों हल नहीं हुई या फिर से आई है...",
  cancel: "रद्द करें",
  confirm_reopen: "पुनः खोलने की पुष्टि करें",
  ticket_reopened: "टिकट सफलतापूर्वक फिर से खोला गया",
  reopen_confirmation_msg: "आपकी शिकायत फिर से खोल दी गई है और पुनः जांच के लिए सौंपी गई है। आपको SMS अपडेट मिलेंगे।",
  view_status: "स्थिति देखें",
  back_to_menu: "मेनू पर वापस",
  register_new_complaint: "नई शिकायत दर्ज करें",
  register_complaint_desc: "किसी भी नागरिक सेवा के लिए नई शिकायत दर्ज करें",
  check_status_desc: "अपनी शिकायत की स्थिति और समयरेखा देखें",
  reopen_ticket_desc: "हल या बंद शिकायत फिर से खोलें",
  wallet: "वॉलेट",
  wallet_desc: "बैलेंस और लेनदेन",
  add_money: "पैसे जोड़ें",
  transaction_history: "लेनदेन इतिहास",
  no_transactions: "अभी तक कोई लेनदेन नहीं",
  add_funds: "पैसे जोड़ें",
  select_amount: "राशि चुनें",
  custom_amount: "कस्टम राशि",
  enter_upi_id: "UPI ID दर्ज करें",
  pay_via_upi: "UPI से भुगतान",
  amount_added: "राशि जोड़ी गई",
  new_balance: "नया बैलेंस",
  back_to_wallet: "वॉलेट पर वापस",
  pin_location: "स्थान चुनें",
  location_pinned: "स्थान चुना गया",
  tap_map_pin: "स्थान चुनने के लिए मानचित्र पर टैप करें",
};

const cg: Translations = {
  ...hi,
  welcome_to: "स्वागत हे",
  suvidha: "सुविधा",
  tagline: "सब नागरिक सेवा बर आपके एक डिजिटल कियोस्क",
  sign_up: "पंजीकरण",
  register_aadhaar: "आधार ले पंजीकरण करव",
  face_login: "फेस लॉगिन",
  mobile_login: "मोबाइल लॉगिन",
  need_help: "मदद चाही?",
  back: "पीछू",
  home: "होम",
  logout: "लॉगआउट",
  thank_you_title: "सुविधा के उपयोग बर धन्यवाद",
  thank_you_message: "आपके सत्र खतम होगे। कियोस्क रीसेट होही।",
};

const mr: Translations = {
  ...hi,
  welcome_to: "स्वागत आहे",
  suvidha: "सुविधा",
  tagline: "सर्व नागरी सेवांसाठी तुमचे एकमेव डिजिटल कियोस्क",
  sign_up: "नोंदणी",
  register_aadhaar: "आधारसह नोंदणी करा",
  face_login: "फेस लॉगिन",
  mobile_login: "मोबाइल लॉगिन",
  need_help: "मदत हवी?",
  back: "मागे",
  home: "होम",
  logout: "लॉगआउट",
  thank_you_title: "सुविधा वापरल्याबद्दल धन्यवाद",
  thank_you_message: "तुमचे सत्र संपले आहे. कियोस्क लवकरच रीसेट होईल.",
  services_dashboard: "सेवा डॅशबोर्ड",
  select_service: "पुढे जाण्यासाठी सेवा निवडा",
};

const te: Translations = {
  ...hi,
  welcome_to: "స్వాగతం",
  suvidha: "సువిధ",
  tagline: "అన్ని పౌర సేవలకు మీ ఏకైక డిజిటల్ కియోస్క్",
  sign_up: "సైన్ అప్",
  register_aadhaar: "ఆధార్‌తో నమోదు",
  face_login: "ఫేస్ లాగిన్",
  mobile_login: "మొబైల్ లాగిన్",
  need_help: "సహాయం కావాలా?",
  back: "వెనుకకు",
  home: "హోమ్",
  logout: "లాగ్అవుట్",
  thank_you_title: "సువిధ వాడినందుకు ధన్యవాదాలు",
  thank_you_message: "మీ సెషన్ ముగిసింది. కియోస్క్ త్వరలో రీసెట్ అవుతుంది.",
};

const ta: Translations = {
  ...hi,
  welcome_to: "வரவேற்கிறோம்",
  suvidha: "சுவிதா",
  tagline: "அனைத்து குடிமக்கள் சேவைகளுக்கான உங்கள் ஒரே டிஜிட்டல் கியோஸ்க்",
  sign_up: "பதிவு செய்",
  register_aadhaar: "ஆதாரைப் பயன்படுத்தி பதிவு செய்யுங்கள்",
  face_login: "முக உள்நுழைவு",
  mobile_login: "மொபைல் உள்நுழைவு",
  need_help: "உதவி வேண்டுமா?",
  back: "பின்செல்",
  home: "முகப்பு",
  logout: "வெளியேறு",
  thank_you_title: "சுவிதாவைப் பயன்படுத்தியதற்கு நன்றி",
  thank_you_message: "உங்கள் அமர்வு முடிந்தது. கியோஸ்க் விரைவில் மீட்டமைக்கப்படும்.",
};

const allTranslations: Record<string, Translations> = {
  "English": en,
  "हिंदी": hi,
  "छत्तीसगढ़ी": cg,
  "मराठी": mr,
  "తెలుగు": te,
  "தமிழ்": ta,
};

export function t(key: TranslationKey, language: string): string {
  const translations = allTranslations[language] || en;
  return translations[key] || en[key] || key;
}

export function getTranslations(language: string): Translations {
  return allTranslations[language] || en;
}
