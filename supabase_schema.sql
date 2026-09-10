-- =============================================
-- ETSON SALES AGENT - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com → project → SQL Editor)
-- =============================================

-- 1. PRODUCTS TABLE
create table if not exists products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  width_mm integer,
  diameter_mm integer,
  core_size_mm integer,
  gsm integer,
  coating text,
  base_price numeric(10,2) not null default 0,
  min_order integer default 100,
  unit text default 'rolls',
  created_at timestamptz default now()
);

-- 2. CAMPAIGNS TABLE
create table if not exists campaigns (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  status text not null default 'draft', -- draft | running | paused | completed
  total_contacts integer default 0,
  contacted integer default 0,
  answered integer default 0,
  not_answered integer default 0,
  hot_leads integer default 0,
  warm_leads integer default 0,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by text default 'Sales Manager'
);

-- 3. LEADS TABLE
create table if not exists leads (
  id text primary key default gen_random_uuid()::text,
  name text,
  company text,
  city text,
  phone text,
  email text,
  needs text,
  product text,
  volume integer default 0,
  budget text,
  application text,
  width text,
  diameter text,
  core_size text,
  current_supplier text,
  supplier_pain text,
  decision_maker text,
  timeline text,
  status text default 'new', -- new | contacted | quoted | won | lost
  category text default 'nurture', -- hot | warm | nurture
  priority integer default 0,
  confidence text default 'Low', -- High | Medium | Low
  consent_source text,
  campaign_id text references campaigns(id),
  call_duration text,
  sentiment text,
  transcript text,
  recording_url text,
  notes text,
  score_breakdown jsonb default '{}',
  created_at timestamptz default now()
);

-- 4. QUOTES TABLE
create table if not exists quotes (
  id text primary key default gen_random_uuid()::text,
  lead_id text references leads(id),
  client text,
  items jsonb default '[]',
  amount text,
  status text default 'draft', -- draft | sent | approved | rejected
  created_at timestamptz default now()
);

-- 5. WEBHOOKS / SETTINGS TABLE (optional - for storing config)
create table if not exists settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- =============================================
-- SEED DATA
-- =============================================

-- Products
insert into products (id, name, description, width_mm, diameter_mm, core_size_mm, gsm, base_price, min_order) values
  ('p1', '80mm POS Thermal Paper', 'High-sensitivity thermal paper for POS billing machines', 80, 80, 12, 55, 15.00, 500),
  ('p2', '57mm POS Thermal Paper', 'Standard width for compact POS terminals', 57, 50, 12, 55, 12.00, 500),
  ('p3', '110mm ATM Thermal Paper', 'Bank-grade ATM roll with security features', 110, 150, 25, 65, 22.00, 1000),
  ('p4', '55mm Medical Thermal Paper', 'BPA-free thermal paper for ECG/USG medical equipment', 55, 40, 12, 60, 28.00, 200),
  ('p5', '80mm Barcode Label Roll', 'Direct thermal labels for warehouse and logistics', 80, 75, 25, 80, 18.00, 1000)
on conflict (id) do nothing;

-- Campaigns
insert into campaigns (id, name, status, total_contacts, contacted, answered, not_answered, hot_leads, warm_leads) values
  ('c1', 'Paperex 2026 Leads', 'running', 250, 180, 145, 35, 5, 3),
  ('c2', 'Hospital & Medical Suppliers', 'paused', 80, 45, 32, 13, 1, 2),
  ('c3', 'Bank ATM Roll Suppliers', 'completed', 150, 150, 98, 52, 8, 12)
on conflict (id) do nothing;

-- Leads
insert into leads (id, name, company, city, phone, email, needs, product, volume, budget, application, width, diameter, core_size, current_supplier, supplier_pain, decision_maker, timeline, status, category, priority, confidence, consent_source, campaign_id, call_duration, sentiment, transcript, notes, score_breakdown) values
  ('l1','Rajesh Kumar','ABC Retail Pvt Ltd','Mumbai','+919876543210','rajesh@abcretail.in','80mm POS','80mm Thermal',5000,'₹25-30/roll','POS Billing','80mm','Not provided','Not provided','Local dealer','Paper jamming issues','Yes','Immediate','new','hot',88,'Medium','Paperex 2026','c1','3:45','Positive','AI: Namaste! Main Etson Manufacturing ke behalf par AI calling assistant hoon...\nProspect: Haan, billing machine ke liye 80mm rolls chahiye. 45 shops hain.\nAI: Monthly kitne rolls chahiye?\nProspect: Around 5000. Current supplier ki quality achhi nahi.','Met at Paperex 2026 exhibition','{"icp_fit":13,"product_fit":12,"volume_revenue":14,"supplier_pain":13,"timeline":9,"decision_authority":8,"commercial_viability":12,"engagement":4}'),
  ('l2','Priya Singh','CityMed Pharmacy Chain','Delhi','+919123456789','priya@citymed.in','55mm Medical','55mm Thermal',2000,'₹30-35/roll','Medical Equipment','55mm','40mm','12mm','None','New requirement','No - needs manager approval','2 weeks','contacted','warm',65,'High','Website inquiry','c1','4:12','Neutral','AI: Namaste! Main Etson Manufacturing ke behalf par call kar rahi hoon...\nProspect: Haan, humein ECG machine ke liye thermal rolls chahiye.','',  '{"icp_fit":10,"product_fit":14,"volume_revenue":10,"supplier_pain":5,"timeline":7,"decision_authority":5,"commercial_viability":10,"engagement":4}'),
  ('l3','Amit Patel','Gujarat Supermart','Ahmedabad','+919988776655','amit@gujmart.com','80mm POS','80mm Thermal',15000,'₹20-25/roll','POS Billing','80mm','80mm','17mm','Another manufacturer','Late deliveries','Yes','Immediate','quoted','hot',95,'High','Referral','c1','5:30','Positive','AI: Namaste Amit ji...\nProspect: 200 stores hain. 80mm rolls chahiye. Current supplier late karta hai.','Largest prospect - 200 store chain','{"icp_fit":15,"product_fit":15,"volume_revenue":15,"supplier_pain":14,"timeline":10,"decision_authority":10,"commercial_viability":12,"engagement":4}'),
  ('l4','Sneha Reddy','TechPOS Solutions','Hyderabad','+919876512345','sneha@techpos.in','Custom ATM Rolls','Custom ATM',8000,'Not disclosed','ATM Machines','110mm','Not provided','Not provided','Imported','High cost','Not confirmed','Q4 2026','new','nurture',45,'Low','Trade directory','c2','2:15','Neutral','Prospect interested but specs not finalized.','','{"icp_fit":8,"product_fit":6,"volume_revenue":12,"supplier_pain":8,"timeline":3,"decision_authority":3,"commercial_viability":3,"engagement":2}'),
  ('l5','Vikram Malhotra','North India Logistics','Chandigarh','+919999988888','vikram@nil.in','Barcode Labels','Barcode Labels',12000,'₹15-20/roll','Barcode Labels','80mm','75mm','25mm','Yes - 3 suppliers','Want consolidated supplier','Yes','Immediate','contacted','hot',88,'High','Cold call consent','c1','6:10','Positive','Prospect wants to consolidate from 3 suppliers to 1.','Wants to consolidate suppliers','{"icp_fit":14,"product_fit":13,"volume_revenue":15,"supplier_pain":12,"timeline":10,"decision_authority":10,"commercial_viability":10,"engagement":4}'),
  ('l6','Anjali Desai','Pune Medical Supplies','Pune','+919876543215','anjali@punemedical.in','55mm Medical','55mm Thermal',3000,'₹28-32/roll','Medical Equipment','55mm','40mm','12mm','Yes','Quality inconsistent','Yes','1 month','contacted','warm',72,'High','Website inquiry','c2','4:00','Positive','Interested in medical grade rolls for ECG machines.','','{"icp_fit":12,"product_fit":14,"volume_revenue":11,"supplier_pain":10,"timeline":6,"decision_authority":9,"commercial_viability":7,"engagement":3}'),
  ('l7','Rohan Gupta','Eastern Retail Hub','Kolkata','+919876543216','','80mm POS','80mm Thermal',500,'Not disclosed','POS Billing','80mm','Not provided','Not provided','Unknown','None mentioned','Not confirmed','Not specified','new','nurture',30,'Low','Purchased list','c1','1:30','Negative','Short call. Low engagement.','Low engagement','{"icp_fit":5,"product_fit":8,"volume_revenue":3,"supplier_pain":2,"timeline":2,"decision_authority":3,"commercial_viability":4,"engagement":3}'),
  ('l8','Neha Joshi','SBI ATM Services','Surat','+919876543217','neha.joshi@sbi.co.in','110mm ATM','110mm ATM',20000,'₹18-22/roll','ATM Machines','110mm','150mm','25mm','Major brand','Want better pricing','No - committee decision','Q1 2027','new','warm',70,'Medium','RFQ response','c3','7:20','Positive','Large ATM roll requirement for SBI branches across Gujarat.','Very large deal potential - SBI procurement','{"icp_fit":14,"product_fit":14,"volume_revenue":15,"supplier_pain":5,"timeline":3,"decision_authority":4,"commercial_viability":11,"engagement":4}'),
  ('l9','Karan Mehra','Mehra Billing Solutions','Ludhiana','+919876543218','karan@mehrabilling.com','80mm POS','80mm Thermal',7000,'₹22-28/roll','POS Billing','80mm','50mm','12mm','Local','Stock availability issues','Yes','Immediate','quoted','hot',90,'High','Trade fair','c1','4:45','Positive','Very interested. Has 100+ billing shops as clients.','Distributor - could bring 100+ shops','{"icp_fit":15,"product_fit":14,"volume_revenue":14,"supplier_pain":12,"timeline":10,"decision_authority":10,"commercial_viability":11,"engagement":4}'),
  ('l10','Pooja Verma','Verma Chemist','Lucknow','+919876543219','pooja@vermachem.in','55mm Medical','55mm Thermal',800,'₹30-40/roll','Medical Equipment','55mm','30mm','12mm','None','First-time buyer','Yes','2 weeks','new','warm',58,'Medium','Google search','c2','3:00','Neutral','Small pharmacy chain. First time buyer.','','{"icp_fit":8,"product_fit":12,"volume_revenue":5,"supplier_pain":3,"timeline":7,"decision_authority":9,"commercial_viability":10,"engagement":4}'),
  ('l11','Deepak Sharma','FastTrack Couriers','Jaipur','+919876543220','deepak@fasttrack.in','Barcode Labels','Barcode Labels',25000,'₹12-18/roll','Barcode Labels','80mm','75mm','25mm','Imported','High cost of imports','Yes','Immediate','new','hot',92,'High','Referral from Vikram','c1','5:00','Positive','Large courier company. Currently importing labels.','Referred by Vikram Malhotra. Very promising.','{"icp_fit":15,"product_fit":14,"volume_revenue":15,"supplier_pain":14,"timeline":10,"decision_authority":10,"commercial_viability":10,"engagement":4}'),
  ('l12','Ritu Agarwal','Agarwal General Store','Varanasi','+919876543221','','57mm POS','57mm Thermal',200,'₹8-12/roll','POS Billing','57mm','30mm','12mm','Local market','None','Yes','Not urgent','new','nurture',22,'Medium','Cold call consent','c1','1:50','Neutral','Very small shop. Buys from local market.','Too small for direct supply','{"icp_fit":3,"product_fit":10,"volume_revenue":2,"supplier_pain":1,"timeline":1,"decision_authority":9,"commercial_viability":3,"engagement":2}')
on conflict (id) do nothing;

-- Quotes
insert into quotes (id, lead_id, client, items, amount, status) values
  ('Q-2026-001','l1','ABC Retail Pvt Ltd','[{"product":"80mm POS Thermal Paper","quantity":5000,"unit_price":15,"amount":75000}]','₹75,000','draft'),
  ('Q-2026-002','l3','Gujarat Supermart','[{"product":"80mm POS Thermal Paper","quantity":15000,"unit_price":14,"amount":210000}]','₹2,10,000','approved'),
  ('Q-2026-003','l9','Mehra Billing Solutions','[{"product":"80mm POS Thermal Paper","quantity":7000,"unit_price":15,"amount":105000}]','₹1,05,000','sent'),
  ('Q-2026-004','l5','North India Logistics','[{"product":"80mm Label Thermal Paper","quantity":12000,"unit_price":20,"amount":240000}]','₹2,40,000','draft'),
  ('Q-2026-005','l11','FastTrack Couriers','[{"product":"Barcode Labels","quantity":25000,"unit_price":12,"amount":300000}]','₹3,00,000','sent')
on conflict (id) do nothing;

-- Enable Row Level Security (optional but recommended)
-- alter table leads enable row level security;
-- alter table campaigns enable row level security;
-- alter table quotes enable row level security;
-- alter table products enable row level security;
