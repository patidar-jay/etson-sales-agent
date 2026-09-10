const API_BASE = 'http://localhost:3001/api';

const fetchJSON = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
};

// Leads
export const getLeads = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetchJSON(`${API_BASE}/leads${query ? '?' + query : ''}`);
};

export const getLeadById = (id) => fetchJSON(`${API_BASE}/leads/${id}`);

export const updateLead = (id, data) => fetchJSON(`${API_BASE}/leads/${id}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});

// Campaigns
export const getCampaigns = () => fetchJSON(`${API_BASE}/campaigns`);
export const getCampaignById = (id) => fetchJSON(`${API_BASE}/campaigns/${id}`);

export const createCampaign = (formData) => fetch(`${API_BASE}/campaigns`, {
  method: 'POST', body: formData
}).then(r => r.json());

export const pauseCampaign = (id) => fetchJSON(`${API_BASE}/campaigns/${id}/pause`, { method: 'PUT' });
export const resumeCampaign = (id) => fetchJSON(`${API_BASE}/campaigns/${id}/resume`, { method: 'PUT' });

// Quotes
export const getQuotes = () => fetchJSON(`${API_BASE}/quotes`);
export const createQuote = (data) => fetchJSON(`${API_BASE}/quotes`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const approveQuote = (id) => fetchJSON(`${API_BASE}/quotes/${id}/approve`, { method: 'PUT' });
export const rejectQuote = (id) => fetchJSON(`${API_BASE}/quotes/${id}/reject`, { method: 'PUT' });
export const sendQuote = (id) => fetchJSON(`${API_BASE}/quotes/${id}/send`, { method: 'POST' });

// Products
export const getProducts = () => fetchJSON(`${API_BASE}/products`);
export const createProduct = (data) => fetchJSON(`${API_BASE}/products`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const updateProduct = (id, data) => fetchJSON(`${API_BASE}/products/${id}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const deleteProduct = (id) => fetchJSON(`${API_BASE}/products/${id}`, { method: 'DELETE' });

// Analytics
export const getAnalyticsOverview = () => fetchJSON(`${API_BASE}/analytics/overview`);
export const getLeadsByProduct = () => fetchJSON(`${API_BASE}/analytics/leads-by-product`);
export const getLeadsByCity = () => fetchJSON(`${API_BASE}/analytics/leads-by-city`);
export const getConversionFunnel = () => fetchJSON(`${API_BASE}/analytics/conversion-funnel`);
export const getDailyTrend = () => fetchJSON(`${API_BASE}/analytics/daily-trend`);

// Lead Stats
export const getLeadStats = () => fetchJSON(`${API_BASE}/leads/stats`);
