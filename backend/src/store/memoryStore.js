import crypto from 'crypto';

class MemoryStore {
  constructor() {
    this.data = {};
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = {};
    }
    
    return {
      doc: (id) => {
        const docId = id || crypto.randomUUID();
        return {
          set: async (data) => {
            this.data[name][docId] = { ...data, id: docId };
            return { id: docId };
          },
          get: async () => {
            const doc = this.data[name][docId];
            return {
              exists: !!doc,
              data: () => doc,
              id: docId
            };
          },
          update: async (data) => {
            if (this.data[name][docId]) {
              this.data[name][docId] = { ...this.data[name][docId], ...data };
            }
          },
          delete: async () => {
            delete this.data[name][docId];
          }
        };
      },
      where: (field, op, value) => {
        // Mock where clause for simple queries
        return {
          get: async () => {
            const docs = Object.values(this.data[name]).filter(doc => {
              if (op === '==') return doc[field] === value;
              return false;
            });
            return {
              docs: docs.map(doc => ({
                data: () => doc,
                id: doc.id
              }))
            };
          }
        };
      },
      get: async () => {
        const docs = Object.values(this.data[name]);
        return {
          docs: docs.map(doc => ({
            data: () => doc,
            id: doc.id
          }))
        };
      }
    };
  }
}

export const memoryStore = new MemoryStore();

// Pre-populate data
const initializeStore = async () => {
  const products = [
    { id: '1', name: '57mm POS Thermal Paper', price: 10, category: 'POS' },
    { id: '2', name: '80mm POS Thermal Paper', price: 15, category: 'POS' },
    { id: '3', name: '110mm ATM Thermal Paper', price: 20, category: 'ATM' },
    { id: '4', name: '80mm Label Thermal Paper', price: 25, category: 'Label' },
    { id: '5', name: '55mm Medical Thermal Paper', price: 30, category: 'Medical' }
  ];

  for (const product of products) {
    await memoryStore.collection('products').doc(product.id).set(product);
  }

  const leads = [
    { id: 'l1', name: 'Rajesh Kumar', company: 'ABC Retail Pvt Ltd', city: 'Mumbai', phone: '+919876543210', email: 'rajesh@abcretail.in', needs: '80mm POS', product: '80mm Thermal', volume: 5000, budget: '₹25-30/roll', application: 'POS Billing', width: '80mm', diameter: 'Not provided', core_size: 'Not provided', current_supplier: 'Local dealer', supplier_pain: 'Paper jamming issues', decision_maker: 'Yes', timeline: 'Immediate', status: 'new', category: 'hot', priority: 88, confidence: 'Medium', consent_source: 'Paperex 2026', campaign_id: 'c1', call_duration: '3:45', sentiment: 'Positive', transcript: 'AI: Namaste! Main Etson Manufacturing ke behalf par AI calling assistant hoon...\nProspect: Haan, billing machine ke liye 80mm rolls chahiye. 45 shops hain.\nAI: Monthly kitne rolls chahiye?\nProspect: Around 5000. Current supplier ki quality achhi nahi.\nAI: Samajh gayi. Sales team quotation draft prepare karegi.', recording_url: '#', notes: 'Met at Paperex 2026 exhibition', created_at: '2026-09-10T10:30:00Z', score_breakdown: { icp_fit: 13, product_fit: 12, volume_revenue: 14, supplier_pain: 13, timeline: 9, decision_authority: 8, commercial_viability: 12, engagement: 4 } },
    { id: 'l2', name: 'Priya Singh', company: 'CityMed Pharmacy Chain', city: 'Delhi', phone: '+919123456789', email: 'priya@citymed.in', needs: '55mm Medical', product: '55mm Thermal', volume: 2000, budget: '₹30-35/roll', application: 'Medical Equipment', width: '55mm', diameter: '40mm', core_size: '12mm', current_supplier: 'None', supplier_pain: 'New requirement', decision_maker: 'No - needs manager approval', timeline: '2 weeks', status: 'contacted', category: 'warm', priority: 65, confidence: 'High', consent_source: 'Website inquiry', campaign_id: 'c1', call_duration: '4:12', sentiment: 'Neutral', transcript: 'AI: Namaste! Main Etson Manufacturing ke behalf par call kar rahi hoon...\nProspect: Haan, humein ECG machine ke liye thermal rolls chahiye.\nAI: 55mm width sahi rahega. Monthly quantity?\nProspect: Around 2000 rolls. Manager se baat karni padegi.', recording_url: '#', notes: '', created_at: '2026-09-09T14:20:00Z', score_breakdown: { icp_fit: 10, product_fit: 14, volume_revenue: 10, supplier_pain: 5, timeline: 7, decision_authority: 5, commercial_viability: 10, engagement: 4 } },
    { id: 'l3', name: 'Amit Patel', company: 'Gujarat Supermart', city: 'Ahmedabad', phone: '+919988776655', email: 'amit@gujmart.com', needs: '80mm POS', product: '80mm Thermal', volume: 15000, budget: '₹20-25/roll', application: 'POS Billing', width: '80mm', diameter: '80mm', core_size: '17mm', current_supplier: 'Another manufacturer', supplier_pain: 'Late deliveries', decision_maker: 'Yes', timeline: 'Immediate', status: 'quoted', category: 'hot', priority: 95, confidence: 'High', consent_source: 'Referral', campaign_id: 'c1', call_duration: '5:30', sentiment: 'Positive', transcript: 'AI: Namaste Amit ji...\nProspect: Haan, hum bahut bada chain hain. 200 stores. 80mm rolls chahiye.\nAI: 15000 rolls per month?\nProspect: Haan. Current supplier deliveries late karta hai. Agar aap time pe de sakte ho to switch karenge.', recording_url: '#', notes: 'Largest prospect - 200 store chain', created_at: '2026-09-08T09:00:00Z', score_breakdown: { icp_fit: 15, product_fit: 15, volume_revenue: 15, supplier_pain: 14, timeline: 10, decision_authority: 10, commercial_viability: 12, engagement: 4 } },
    { id: 'l4', name: 'Sneha Reddy', company: 'TechPOS Solutions', city: 'Hyderabad', phone: '+919876512345', email: 'sneha@techpos.in', needs: 'Custom ATM Rolls', product: 'Custom ATM', volume: 8000, budget: 'Not disclosed', application: 'ATM Machines', width: '110mm', diameter: 'Not provided', core_size: 'Not provided', current_supplier: 'Imported', supplier_pain: 'High cost', decision_maker: 'Not confirmed', timeline: 'Q4 2026', status: 'new', category: 'nurture', priority: 45, confidence: 'Low', consent_source: 'Trade directory', campaign_id: 'c2', call_duration: '2:15', sentiment: 'Neutral', transcript: 'AI: Namaste! Etson Manufacturing se call kar rahi hoon...\nProspect: ATM rolls chahiye par specifications abhi finalize nahi hui.', recording_url: '#', notes: '', created_at: '2026-09-07T16:45:00Z', score_breakdown: { icp_fit: 8, product_fit: 6, volume_revenue: 12, supplier_pain: 8, timeline: 3, decision_authority: 3, commercial_viability: 3, engagement: 2 } },
    { id: 'l5', name: 'Vikram Malhotra', company: 'North India Logistics', city: 'Chandigarh', phone: '+919999988888', email: 'vikram@nil.in', needs: 'Barcode Labels', product: 'Barcode Labels', volume: 12000, budget: '₹15-20/roll', application: 'Barcode Labels', width: '80mm', diameter: '75mm', core_size: '25mm', current_supplier: 'Yes - 3 suppliers', supplier_pain: 'Want consolidated supplier', decision_maker: 'Yes', timeline: 'Immediate', status: 'contacted', category: 'hot', priority: 88, confidence: 'High', consent_source: 'Cold call consent', campaign_id: 'c1', call_duration: '6:10', sentiment: 'Positive', transcript: 'AI: Namaste Vikram ji...\nProspect: Haan, humein label rolls chahiye for warehousing. 3 suppliers se le rahe hain, ek se lena chahte hain.', recording_url: '#', notes: 'Wants to consolidate from 3 suppliers to 1', created_at: '2026-09-06T11:20:00Z', score_breakdown: { icp_fit: 14, product_fit: 13, volume_revenue: 15, supplier_pain: 12, timeline: 10, decision_authority: 10, commercial_viability: 10, engagement: 4 } },
    { id: 'l6', name: 'Anjali Desai', company: 'Pune Medical Supplies', city: 'Pune', phone: '+919876543215', email: 'anjali@punemedical.in', needs: '55mm Medical', product: '55mm Thermal', volume: 3000, budget: '₹28-32/roll', application: 'Medical Equipment', width: '55mm', diameter: '40mm', core_size: '12mm', current_supplier: 'Yes', supplier_pain: 'Quality inconsistent', decision_maker: 'Yes', timeline: '1 month', status: 'contacted', category: 'warm', priority: 72, confidence: 'High', consent_source: 'Website inquiry', campaign_id: 'c2', call_duration: '4:00', sentiment: 'Positive', transcript: 'Prospect interested in medical grade rolls for ECG and USG machines.', recording_url: '#', notes: '', created_at: '2026-09-05T13:15:00Z', score_breakdown: { icp_fit: 12, product_fit: 14, volume_revenue: 11, supplier_pain: 10, timeline: 6, decision_authority: 9, commercial_viability: 7, engagement: 3 } },
    { id: 'l7', name: 'Rohan Gupta', company: 'Eastern Retail Hub', city: 'Kolkata', phone: '+919876543216', email: '', needs: '80mm POS', product: '80mm Thermal', volume: 500, budget: 'Not disclosed', application: 'POS Billing', width: '80mm', diameter: 'Not provided', core_size: 'Not provided', current_supplier: 'Unknown', supplier_pain: 'None mentioned', decision_maker: 'Not confirmed', timeline: 'Not specified', status: 'new', category: 'nurture', priority: 30, confidence: 'Low', consent_source: 'Purchased list', campaign_id: 'c1', call_duration: '1:30', sentiment: 'Negative', transcript: 'Short call. Prospect not very interested but did not opt out.', recording_url: '#', notes: 'Low engagement', created_at: '2026-09-04T10:00:00Z', score_breakdown: { icp_fit: 5, product_fit: 8, volume_revenue: 3, supplier_pain: 2, timeline: 2, decision_authority: 3, commercial_viability: 4, engagement: 3 } },
    { id: 'l8', name: 'Neha Joshi', company: 'SBI ATM Services', city: 'Surat', phone: '+919876543217', email: 'neha.joshi@sbi.co.in', needs: '110mm ATM', product: '110mm ATM', volume: 20000, budget: '₹18-22/roll', application: 'ATM Machines', width: '110mm', diameter: '150mm', core_size: '25mm', current_supplier: 'Major brand', supplier_pain: 'Want better pricing', decision_maker: 'No - committee decision', timeline: 'Q1 2027', status: 'new', category: 'warm', priority: 70, confidence: 'Medium', consent_source: 'RFQ response', campaign_id: 'c3', call_duration: '7:20', sentiment: 'Positive', transcript: 'Large ATM roll requirement for SBI branches across Gujarat. Committee-based procurement process.', recording_url: '#', notes: 'Very large deal potential - SBI procurement', created_at: '2026-09-03T15:30:00Z', score_breakdown: { icp_fit: 14, product_fit: 14, volume_revenue: 15, supplier_pain: 5, timeline: 3, decision_authority: 4, commercial_viability: 11, engagement: 4 } },
    { id: 'l9', name: 'Karan Mehra', company: 'Mehra Billing Solutions', city: 'Ludhiana', phone: '+919876543218', email: 'karan@mehrabilling.com', needs: '80mm POS', product: '80mm Thermal', volume: 7000, budget: '₹22-28/roll', application: 'POS Billing', width: '80mm', diameter: '50mm', core_size: '12mm', current_supplier: 'Local', supplier_pain: 'Stock availability issues', decision_maker: 'Yes', timeline: 'Immediate', status: 'quoted', category: 'hot', priority: 90, confidence: 'High', consent_source: 'Trade fair', campaign_id: 'c1', call_duration: '4:45', sentiment: 'Positive', transcript: 'Very interested. Has 100+ billing shops as clients. Wants reliable supply partner.', recording_url: '#', notes: 'Distributor - could bring 100+ shops', created_at: '2026-09-02T09:45:00Z', score_breakdown: { icp_fit: 15, product_fit: 14, volume_revenue: 14, supplier_pain: 12, timeline: 10, decision_authority: 10, commercial_viability: 11, engagement: 4 } },
    { id: 'l10', name: 'Pooja Verma', company: 'Verma Chemist', city: 'Lucknow', phone: '+919876543219', email: 'pooja@vermachem.in', needs: '55mm Medical', product: '55mm Thermal', volume: 800, budget: '₹30-40/roll', application: 'Medical Equipment', width: '55mm', diameter: '30mm', core_size: '12mm', current_supplier: 'None', supplier_pain: 'First-time buyer', decision_maker: 'Yes', timeline: '2 weeks', status: 'new', category: 'warm', priority: 58, confidence: 'Medium', consent_source: 'Google search', campaign_id: 'c2', call_duration: '3:00', sentiment: 'Neutral', transcript: 'Small pharmacy chain. First time buying thermal rolls for new ECG machine.', recording_url: '#', notes: '', created_at: '2026-09-01T11:00:00Z', score_breakdown: { icp_fit: 8, product_fit: 12, volume_revenue: 5, supplier_pain: 3, timeline: 7, decision_authority: 9, commercial_viability: 10, engagement: 4 } },
    { id: 'l11', name: 'Deepak Sharma', company: 'FastTrack Couriers', city: 'Jaipur', phone: '+919876543220', email: 'deepak@fasttrack.in', needs: 'Barcode Labels', product: 'Barcode Labels', volume: 25000, budget: '₹12-18/roll', application: 'Barcode Labels', width: '80mm', diameter: '75mm', core_size: '25mm', current_supplier: 'Imported', supplier_pain: 'High cost of imports', decision_maker: 'Yes', timeline: 'Immediate', status: 'new', category: 'hot', priority: 92, confidence: 'High', consent_source: 'Referral from Vikram', campaign_id: 'c1', call_duration: '5:00', sentiment: 'Positive', transcript: 'Large courier company. Currently importing labels. Wants domestic supplier for cost savings.', recording_url: '#', notes: 'Referred by Vikram Malhotra (l5). Very promising.', created_at: '2026-08-30T14:00:00Z', score_breakdown: { icp_fit: 15, product_fit: 14, volume_revenue: 15, supplier_pain: 14, timeline: 10, decision_authority: 10, commercial_viability: 10, engagement: 4 } },
    { id: 'l12', name: 'Ritu Agarwal', company: 'Agarwal General Store', city: 'Varanasi', phone: '+919876543221', email: '', needs: '57mm POS', product: '57mm Thermal', volume: 200, budget: '₹8-12/roll', application: 'POS Billing', width: '57mm', diameter: '30mm', core_size: '12mm', current_supplier: 'Local market', supplier_pain: 'None', decision_maker: 'Yes', timeline: 'Not urgent', status: 'new', category: 'nurture', priority: 22, confidence: 'Medium', consent_source: 'Cold call consent', campaign_id: 'c1', call_duration: '1:50', sentiment: 'Neutral', transcript: 'Very small shop. Buys from local market. Not much interest in changing.', recording_url: '#', notes: 'Too small for direct supply', created_at: '2026-08-29T10:30:00Z', score_breakdown: { icp_fit: 3, product_fit: 10, volume_revenue: 2, supplier_pain: 1, timeline: 1, decision_authority: 9, commercial_viability: 3, engagement: 2 } }
  ];

  for (const lead of leads) {
    await memoryStore.collection('leads').doc(lead.id).set(lead);
  }

  const campaigns = [
    { id: 'c1', name: 'Paperex 2026 Leads', status: 'running', total_contacts: 250, contacted: 180, answered: 145, not_answered: 35, hot_leads: 5, warm_leads: 3, created_at: '2026-09-01T08:00:00Z', started_at: '2026-09-01T09:00:00Z', created_by: 'Sales Manager' },
    { id: 'c2', name: 'Hospital & Medical Suppliers', status: 'paused', total_contacts: 80, contacted: 45, answered: 32, not_answered: 13, hot_leads: 1, warm_leads: 2, created_at: '2026-09-05T10:00:00Z', started_at: '2026-09-05T11:00:00Z', created_by: 'Sales Manager' },
    { id: 'c3', name: 'Bank ATM Roll Suppliers', status: 'completed', total_contacts: 150, contacted: 150, answered: 98, not_answered: 52, hot_leads: 8, warm_leads: 12, created_at: '2026-08-15T08:00:00Z', started_at: '2026-08-15T09:00:00Z', completed_at: '2026-08-25T18:00:00Z', created_by: 'Sales Manager' }
  ];

  for (const campaign of campaigns) {
    await memoryStore.collection('campaigns').doc(campaign.id).set(campaign);
  }
};

initializeStore();
