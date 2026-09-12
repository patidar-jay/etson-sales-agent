import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_AGENT_ID = process.env.SARVAM_AGENT_ID;

// Known potential endpoints for Sarvam Outbound calls
const SARVAM_API_URL = 'https://api.sarvam.ai/voice-agents/v1/outbound-calls';
const SARVAM_FALLBACK_URL = 'https://api.sarvam.ai/v1/agents/outbound-calls';

export const triggerOutboundCall = async (phoneNumber, leadDetails = {}) => {
  if (!SARVAM_API_KEY || !SARVAM_AGENT_ID) {
    throw new Error('Sarvam API credentials not configured');
  }

  // Determine base callback URL (production vs local)
  const baseUrl = process.env.VITE_API_URL 
    ? process.env.VITE_API_URL.replace('/api', '') 
    : 'https://etson-sales-agent.vercel.app';
  
  const callbackUrl = `${baseUrl}/api/webhooks/sarvam`;

  const payload = {
    agent_id: SARVAM_AGENT_ID,
    phone_number: phoneNumber,
    override_dynamic_variables: leadDetails,
    callback_url: callbackUrl,
  };

  try {
    let response = await fetch(SARVAM_API_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status === 404) {
      // Fallback if the first endpoint doesn't exist
      response = await fetch(SARVAM_FALLBACK_URL, {
        method: 'POST',
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sarvam API Error:', errorText);
      throw new Error(`Sarvam API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to trigger Sarvam call:', error);
    throw error;
  }
};
