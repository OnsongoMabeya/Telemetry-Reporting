/**
 * WhatsApp Service for Meta Cloud API
 * Handles sending template messages for offline alerts and recovery notifications
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Meta WhatsApp API Configuration
const WHATSAPP_API_VERSION = 'v19.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Check if WhatsApp is configured and ready to send messages
 * @returns {boolean} - True if both PHONE_NUMBER_ID and ACCESS_TOKEN are set
 */
function isConfigured() {
  return !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
}

/**
 * Format phone number to WhatsApp-compliant format
 * Ensures number starts with + and has no spaces
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters except the leading +
  let formatted = phoneNumber.trim();
  
  // Ensure it starts with +
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  // Remove any remaining spaces or special characters
  formatted = formatted.replace(/\s/g, '').replace(/[^\d+]/g, '');
  
  return formatted;
}

/**
 * Send a template message via Meta WhatsApp Cloud API
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (international format)
 * @param {string} params.templateName - Meta-approved template name
 * @param {string} params.languageCode - Template language code (default: en_US)
 * @param {Array} params.components - Template components with variables
 * @returns {Promise<Object>} - Meta API response
 */
async function sendTemplateMessage({ to, templateName, languageCode = 'en_US', components = [] }) {
  // Validate configuration
  if (!isConfigured()) {
    logger.warn('WhatsApp not configured - skipping message send', {
      to,
      template: templateName,
      hint: 'Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env'
    });
    return {
      success: false,
      skipped: true,
      reason: 'WhatsApp not configured'
    };
  }
  
  // Format phone number
  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) {
    throw new Error('Invalid phone number provided');
  }
  
  // Remove + for Meta API (they expect numbers without the +)
  const recipientNumber = formattedTo.replace('+', '');
  
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };
  
  // Add components if provided
  if (components.length > 0) {
    payload.template.components = components;
  }
  
  try {
    logger.info(`Sending WhatsApp template message`, {
      to: formattedTo,
      template: templateName,
      recipientNumber
    });
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp message sent successfully`, {
      to: formattedTo,
      template: templateName,
      messageId: response.data.messages?.[0]?.id
    });
    
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      response: response.data
    };
    
  } catch (error) {
    const errorDetail = error.response?.data?.error || error.message;
    logger.error(`Failed to send WhatsApp message`, {
      to: formattedTo,
      template: templateName,
      error: errorDetail
    });
    
    throw new Error(`WhatsApp send failed: ${JSON.stringify(errorDetail)}`);
  }
}

/**
 * Send offline alert via WhatsApp
 * Uses bsi_site_offline_alert template
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient phone number(s)
 * @param {string} params.baseStationName - Name of the offline base station
 * @param {string} params.lastDataReceived - Timestamp of last data received
 * @param {string[]} params.affectedServices - List of affected service names
 * @returns {Promise<Object[]>} - Array of send results
 */
async function sendWhatsAppOfflineAlert({ to, baseStationName, lastDataReceived, affectedServices = [] }) {
  // Skip if not configured
  if (!isConfigured()) {
    logger.debug('WhatsApp offline alert skipped - not configured');
    return [{ success: false, skipped: true, reason: 'WhatsApp not configured' }];
  }

  // Handle single number or array
  const recipients = Array.isArray(to) ? to : [to];
  const results = [];
  
  // Format affected services for display
  const servicesList = affectedServices.length > 0 
    ? affectedServices.join(', ')
    : 'No services registered';
  
  // Format timestamp for readability
  const formattedTime = new Date(lastDataReceived).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi'
  });
  
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: baseStationName },
        { type: 'text', text: formattedTime },
        { type: 'text', text: servicesList }
      ]
    }
  ];
  
  for (const recipient of recipients) {
    try {
      const result = await sendTemplateMessage({
        to: recipient,
        templateName: 'bsi_site_offline_alert',
        languageCode: 'en',
        components
      });
      results.push({ recipient, success: true, messageId: result.messageId });
    } catch (error) {
      results.push({ recipient, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Send recovery alert via WhatsApp
 * Uses bsi_site_recovery_alert template
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient phone number(s)
 * @param {string} params.baseStationName - Name of the recovered base station
 * @param {string} params.lastDataReceived - Timestamp of last data received
 * @param {string} params.downtime - Formatted downtime string (e.g., "2h 15m")
 * @returns {Promise<Object[]>} - Array of send results
 */
async function sendWhatsAppRecoveryAlert({ to, baseStationName, lastDataReceived, downtime }) {
  // Skip if not configured
  if (!isConfigured()) {
    logger.debug('WhatsApp recovery alert skipped - not configured');
    return [{ success: false, skipped: true, reason: 'WhatsApp not configured' }];
  }

  // Handle single number or array
  const recipients = Array.isArray(to) ? to : [to];
  const results = [];
  
  // Format timestamp for readability
  const formattedTime = new Date(lastDataReceived).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi'
  });
  
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: baseStationName },
        { type: 'text', text: formattedTime },
        { type: 'text', text: downtime }
      ]
    }
  ];
  
  for (const recipient of recipients) {
    try {
      const result = await sendTemplateMessage({
        to: recipient,
        templateName: 'bsi_site_recovery_alert',
        languageCode: 'en',
        components
      });
      results.push({ recipient, success: true, messageId: result.messageId });
    } catch (error) {
      results.push({ recipient, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Test function to verify WhatsApp configuration
 * Sends a test message using the integration test template
 * @param {string} to - Test recipient phone number
 * @returns {Promise<Object>} - Test result
 */
async function testConfiguration(to) {
  try {
    logger.info('Testing WhatsApp configuration', { to });
    
    const result = await sendTemplateMessage({
      to,
      templateName: '3p_direct_integration_test_template',
      languageCode: 'en_US'
    });
    
    return {
      success: true,
      message: 'Test message sent successfully',
      messageId: result.messageId
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendTemplateMessage,
  sendWhatsAppOfflineAlert,
  sendWhatsAppRecoveryAlert,
  formatPhoneNumber,
  testConfiguration,
  isConfigured
};
